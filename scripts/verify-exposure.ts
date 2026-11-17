import demoAir from "../data/demo-air-quality.json";
import {
  calculateHouseholdExposure,
  HouseholdExposureResult,
  HourlyExposureBreakdown,
  MemberExposureResult,
} from "../src/lib/exposure";
import {
  Activity,
  EnvironmentalContextSchema,
  HomeEnvironment,
  HouseholdProfile,
  HouseholdProfileSchema,
  HourlyForecastPoint,
  Member,
} from "../src/lib/schemas";

function getDelhiMembers(): Member[] {
  return [
    { id: "m-child", roleLabel: "School Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-commuter", roleLabel: "Commuter Parent", category: "adult", outdoorSensitivity: "standard" },
    { id: "m-senior", roleLabel: "Grandmother", category: "older_adult", outdoorSensitivity: "higher" },
  ];
}

function getDelhiActivities(): Activity[] {
  return [
    { id: "a-child-school", memberId: "m-child", type: "school", startTime: "07:30", endTime: "14:00", indoor: true },
    { id: "a-commute-out", memberId: "m-commuter", type: "work", startTime: "08:15", endTime: "09:15", indoor: false, transportMode: "two_wheeler" },
    { id: "a-commute-back", memberId: "m-commuter", type: "work", startTime: "18:00", endTime: "19:00", indoor: false, transportMode: "two_wheeler" },
    { id: "a-cook-lunch", memberId: "m-senior", type: "cooking", startTime: "11:30", endTime: "13:00", indoor: true },
    { id: "a-cook-dinner", memberId: "m-senior", type: "cooking", startTime: "19:00", endTime: "20:30", indoor: true },
  ];
}

function getDelhiHome(): HomeEnvironment {
  return {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: true,
    hasAirPurifier: false,
    usesIncenseOrCoils: true,
  };
}

function createDelhiProfile(): HouseholdProfile {
  return HouseholdProfileSchema.parse({
    location: { city: "Delhi", areaLabel: "Anand Vihar", latitude: 28.6139, longitude: 77.209 },
    members: getDelhiMembers(),
    activities: getDelhiActivities(),
    home: getDelhiHome(),
    constraints: {
      dailyBudgetInr: 150,
      maxExtraTimeMinutesPerDay: 30,
      preferredLanguage: "en",
      nonNegotiableActivityIds: ["a-child-school"],
    },
  });
}

function printHarnessHeader(stationName: string, pm25: number, source: string): void {
  console.log("================================================================================");
  console.log("                    AVIR EXPOSURE ENGINE DIAGNOSTIC HARNESS                     ");
  console.log("================================================================================");
  console.log("[✓] Profile: Delhi Winter Smog Preset (3 Members, 24-Hour Timeline)");
  console.log(`[✓] Ambient Station: ${stationName}`);
  console.log(`[✓] Observed PM2.5: ${pm25} µg/m³ | Source: ${source}`);
  console.log("");
}

function formatHourRow(
  hour: number,
  outdoorPm25: number,
  childResult?: HourlyExposureBreakdown,
  commuterResult?: HourlyExposureBreakdown,
  seniorResult?: HourlyExposureBreakdown
): string {
  const hStr = String(hour).padStart(2, "0");
  const outStr = String(outdoorPm25).padEnd(13, " ");
  const cStr = `${childResult?.primaryActivityType ?? ""} (${Math.round(childResult?.centralEstimate ?? 0)})`.padEnd(16, " ");
  const pStr = `${commuterResult?.primaryActivityType ?? ""} (${Math.round(commuterResult?.centralEstimate ?? 0)})`.padEnd(19, " ");
  const sStr = `${seniorResult?.primaryActivityType ?? ""} (${Math.round(seniorResult?.centralEstimate ?? 0)})`;

  return `${hStr}   | ${outStr} | ${cStr} | ${pStr} | ${sStr}`;
}

function printHourlyAudit(
  result: HouseholdExposureResult,
  hourlyForecast: HourlyForecastPoint[]
): void {
  console.log("--- 24-HOUR HOURLY EXPOSURE AUDIT ---");
  console.log("Hour | Outdoor PM2.5 | Child Act (µg·h) | Commuter Act (µg·h) | Senior Act (µg·h)");
  console.log("-----+---------------+------------------+---------------------+------------------");

  for (let h = 0; h < 24; h++) {
    const forecast = hourlyForecast[h];
    const outdoorPm25 = forecast?.pm25 ?? 0;
    const childH = result.memberExposures["m-child"]?.hourlyBreakdown[h];
    const commuterH = result.memberExposures["m-commuter"]?.hourlyBreakdown[h];
    const seniorH = result.memberExposures["m-senior"]?.hourlyBreakdown[h];

    console.log(formatHourRow(h, outdoorPm25, childH, commuterH, seniorH));
  }
}

function verifyMemberInvariants(exp: MemberExposureResult): boolean {
  const isTimeConserved = Math.abs(exp.totalTimeHours - 24.0) < 0.001;
  const isMonotonic = exp.lowEstimate <= exp.centralEstimate && exp.centralEstimate <= exp.highEstimate;
  const isNonNegative = exp.lowEstimate >= 0;

  let hourlyValid = true;
  for (const slot of exp.hourlyBreakdown) {
    if (slot.lowEstimate > slot.centralEstimate || slot.centralEstimate > slot.highEstimate || slot.lowEstimate < 0) {
      hourlyValid = false;
      break;
    }
  }

  return isTimeConserved && isMonotonic && isNonNegative && hourlyValid;
}

function printMemberAuditRow(member: Member, exp: MemberExposureResult, memberValid: boolean): void {
  const statusTag = memberValid ? "[PASS]" : "[FAIL]";
  const vulnTag = exp.isVulnerable ? "(VULNERABLE)" : "(STANDARD)";
  const label = member.roleLabel.padEnd(18, " ");
  const central = Math.round(exp.centralEstimate);
  const low = Math.round(exp.lowEstimate);
  const high = Math.round(exp.highEstimate);

  console.log(
    `${statusTag} ${label}: Time=${exp.totalTimeHours.toFixed(2)}h | Exposure=${central} µg/m³·h [${low} - ${high}] ${vulnTag}`
  );
}

function printSummaryAndInvariants(
  profile: HouseholdProfile,
  result: HouseholdExposureResult
): boolean {
  console.log("");
  console.log("--- SUMMARY & INVARIANT VERIFICATION ---");

  let allInvariantsPassed = true;

  for (const member of profile.members) {
    const exp = result.memberExposures[member.id];
    if (!exp) continue;

    const memberValid = verifyMemberInvariants(exp);
    if (!memberValid) {
      allInvariantsPassed = false;
    }

    printMemberAuditRow(member, exp, memberValid);
  }

  console.log("");
  const peak = result.peakVulnerableMember;
  const peakCentral = Math.round(peak.exposure.centralEstimate);
  const meanCentral = Math.round(result.householdMeanExposure.centralEstimate);
  console.log(`Peak Vulnerable Member : ${peak.roleLabel} (${peakCentral} µg/m³·h)`);
  console.log(`Household Mean Exposure : ${meanCentral} µg/m³·h`);
  console.log("================================================================================");

  return allInvariantsPassed;
}

function main(): void {
  const envContext = EnvironmentalContextSchema.parse(demoAir);
  const obs = envContext.currentObservation;
  printHarnessHeader(obs.stationName, obs.pm25 ?? 0, obs.source);

  const delhiProfile = createDelhiProfile();
  const exposureResult = calculateHouseholdExposure(delhiProfile, envContext.hourlyForecast);

  printHourlyAudit(exposureResult, envContext.hourlyForecast);
  const passed = printSummaryAndInvariants(delhiProfile, exposureResult);

  if (!passed) {
    console.error("DIAGNOSTIC FAILURE: Mathematical invariants not satisfied!");
    process.exit(1);
  }

  console.log("ALL 4 MATHEMATICAL INVARIANTS SATISFIED.");
  process.exit(0);
}

main();
