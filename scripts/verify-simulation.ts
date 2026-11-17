import demoAir from "../data/demo-air-quality.json";
import { HouseholdProfile, HouseholdProfileSchema, HourlyForecastPoint } from "../src/lib/schemas";
import { simulateRoutine } from "../src/lib/simulation";

function createPresetDelhiProfile(): HouseholdProfile {
  return HouseholdProfileSchema.parse({
    location: {
      city: "Delhi",
      areaLabel: "Anand Vihar",
      latitude: 28.6139,
      longitude: 77.209,
    },
    members: [
      { id: "m-child", roleLabel: "School Child", category: "child", outdoorSensitivity: "higher" },
      { id: "m-commuter", roleLabel: "Commuter Parent", category: "adult", outdoorSensitivity: "standard" },
      { id: "m-senior", roleLabel: "Grandmother", category: "older_adult", outdoorSensitivity: "higher" },
    ],
    activities: [
      {
        id: "a-child-school",
        memberId: "m-child",
        type: "school",
        startTime: "07:30",
        endTime: "14:00",
        indoor: true,
      },
      {
        id: "a-commute-out",
        memberId: "m-commuter",
        type: "work",
        startTime: "08:15",
        endTime: "09:15",
        indoor: false,
        transportMode: "two_wheeler",
        commuteDistanceKm: 15,
        originLabel: "Anand Vihar",
        destinationLabel: "Connaught Place",
      },
      {
        id: "a-commute-back",
        memberId: "m-commuter",
        type: "work",
        startTime: "18:00",
        endTime: "19:00",
        indoor: false,
        transportMode: "two_wheeler",
        commuteDistanceKm: 15,
        originLabel: "Connaught Place",
        destinationLabel: "Anand Vihar",
      },
      {
        id: "a-senior-walk",
        memberId: "m-senior",
        type: "exercise",
        startTime: "06:00",
        endTime: "07:00",
        indoor: false,
      },
      {
        id: "a-cook-lunch",
        memberId: "m-senior",
        type: "cooking",
        startTime: "11:30",
        endTime: "13:00",
        indoor: true,
      },
      {
        id: "a-cook-dinner",
        memberId: "m-senior",
        type: "cooking",
        startTime: "19:00",
        endTime: "20:30",
        indoor: true,
      },
    ],
    home: {
      ventilation: "moderate",
      cookingFuel: "lpg",
      hasOutdoorExhaust: false,
      hasAirPurifier: false,
      usesIncenseOrCoils: true,
    },
    constraints: {
      dailyBudgetInr: 500,
      maxExtraTimeMinutesPerDay: 45,
      preferredLanguage: "en",
      nonNegotiableActivityIds: ["a-child-school"],
    },
  });
}

function printHeader(): void {
  console.log("================================================================================");
  console.log("                 AVIR COUNTERFACTUAL SIMULATION DIAGNOSTIC                      ");
  console.log("================================================================================");
  console.log("[✓] Profile: Delhi Multigenerational Preset (3 Members, 6 Activities)");
}

function printSelectedInterventions(interventions: string[]): void {
  console.log(`[✓] Selected Stacked Interventions (${interventions.length}):`);
  for (const id of interventions) {
    console.log(`    - ${id}`);
  }
  console.log("");
}

function printPillar1PersonalProtection(result: ReturnType<typeof simulateRoutine>): void {
  const pp = result.combinedPersonalProtection;
  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 1: PERSONAL PROTECTION (EXPOSURE PROXY REDUCTION)");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Peak Vulnerable Baseline Exposure  : ${pp.baselinePeakVulnerable} µg/m³·h`);
  console.log(`Peak Vulnerable Projected Exposure : ${pp.projectedPeakVulnerable} µg/m³·h`);
  console.log(`Peak Exposure Delta (ΔE_proxy)     : ${pp.deltaPeakExposureProxy} µg/m³·h (Negative = Reduced)`);
  console.log(`Household Mean Exposure Baseline   : ${pp.baselineHouseholdMean} µg/m³·h`);
  console.log(`Household Mean Projected Exposure  : ${pp.projectedHouseholdMean} µg/m³·h`);
  console.log(`Relative Reduction Bounds          : [${pp.relativeReductionPercentRange[0]}%, ${pp.relativeReductionPercentRange[1]}%]`);
  console.log(`Model Confidence                   : ${pp.confidence.toUpperCase()}`);
  console.log("");
}

function printPillar2Environmental(result: ReturnType<typeof simulateRoutine>): void {
  const ec = result.combinedEnvironmentalContribution;
  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 2: ENVIRONMENTAL CONTRIBUTION (HONEST EMISSION ACCOUNTING)");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Private Vehicle Travel Avoided     : ${ec.privateVehicleKmAvoidedPerDay.toFixed(1)} km/day`);
  console.log(`Indoor Combustion Sources Reduced   : ${ec.indoorCombustionSourceReduced ? "YES" : "NO"}`);
  console.log(`Accounting Summary                 : ${ec.summary}`);
  console.log("");
}

function printPillar3Practicality(
  result: ReturnType<typeof simulateRoutine>,
  profile: HouseholdProfile
): void {
  const pr = result.combinedPracticality;
  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 3: PRACTICALITY & CONSTRAINTS");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Estimated Financial Outlay         : ₹${pr.estimatedCostInr} (Budget: ₹${profile.constraints.dailyBudgetInr})`);
  console.log(`Daily Time Impact                  : ${pr.timeImpactMinutesPerDay} min (Max Allowed: ${profile.constraints.maxExtraTimeMinutesPerDay} min)`);
  console.log(`Routine Inconvenience Level        : ${pr.inconvenienceLevel.toUpperCase()}`);
  console.log(`Within Household Constraints       : ${pr.withinHouseholdConstraints ? "YES [PASS]" : "NO [FAIL]"}`);
  if (pr.mapsDirectionsUrl) {
    console.log(`Transit Directions Deep Link       : ${pr.mapsDirectionsUrl}`);
  }
  console.log("");
}

function verifyInvariants(
  profile: HouseholdProfile,
  result: ReturnType<typeof simulateRoutine>
): boolean {
  console.log("--------------------------------------------------------------------------------");
  console.log("INVARIANT VERIFICATION");
  console.log("--------------------------------------------------------------------------------");
  let passed = true;

  const originalSchool = profile.activities.find((a) => a.id === "a-child-school")!;
  const shiftedSchool = result.counterfactualProfile.activities.find((a) => a.id === "a-child-school")!;
  const lockedOk = originalSchool.startTime === shiftedSchool.startTime && originalSchool.endTime === shiftedSchool.endTime;
  console.log(`[${lockedOk ? "PASS" : "FAIL"}] Non-Negotiable Activity Hard Lock: ${shiftedSchool.id} remained at ${shiftedSchool.startTime}-${shiftedSchool.endTime}`);
  if (!lockedOk) passed = false;

  const shiftedWalk = result.counterfactualProfile.activities.find((a) => a.id === "a-senior-walk")!;
  const exerciseShiftOk = shiftedWalk.startTime === "14:00";
  console.log(`[${exerciseShiftOk ? "PASS" : "FAIL"}] Cleanest Window Rescheduling: ${shiftedWalk.id} shifted to 14:00 trough (was 06:00)`);
  if (!exerciseShiftOk) passed = false;

  const ec = result.combinedEnvironmentalContribution;
  const kmOk = ec.privateVehicleKmAvoidedPerDay === 30.0;
  console.log(`[${kmOk ? "PASS" : "FAIL"}] Avoided Private Vehicle Travel: ${ec.privateVehicleKmAvoidedPerDay} km (15km x 2 trips)`);
  if (!kmOk) passed = false;

  const pp = result.combinedPersonalProtection;
  const deltaOk = pp.deltaPeakExposureProxy < 0;
  console.log(`[${deltaOk ? "PASS" : "FAIL"}] Personal Exposure Proxy Reduced: Δ = ${pp.deltaPeakExposureProxy} µg/m³·h`);
  if (!deltaOk) passed = false;

  const pr = result.combinedPracticality;
  const constrOk = pr.withinHouseholdConstraints === true;
  console.log(`[${constrOk ? "PASS" : "FAIL"}] Practicality Within Budget & Time Bounds`);
  if (!constrOk) passed = false;

  const hasCompositeScore = "compositeScore" in (result as unknown as Record<string, unknown>);
  console.log(`[${!hasCompositeScore ? "PASS" : "FAIL"}] Absolute Independence: Zero composite score computed`);
  if (hasCompositeScore) passed = false;

  console.log("================================================================================");
  return passed;
}

function main(): void {
  printHeader();

  const profile = createPresetDelhiProfile();
  const selectedInterventions = [
    "metro_transit_shift",
    "weatherstrip_windows",
    "shift_morning_exercise",
    "eliminate_evening_incense",
  ];

  printSelectedInterventions(selectedInterventions);

  const hourlyForecast = demoAir.hourlyForecast as HourlyForecastPoint[];
  const result = simulateRoutine(profile, selectedInterventions, hourlyForecast);

  printPillar1PersonalProtection(result);
  printPillar2Environmental(result);
  printPillar3Practicality(result, profile);

  const passed = verifyInvariants(profile, result);
  if (!passed) {
    console.error("DIAGNOSTIC FAILURE: One or more simulation invariants violated!");
    process.exit(1);
  }

  console.log("ALL 6 SIMULATION INVARIANTS SATISFIED. THREE PILLARS STRICTLY INDEPENDENT.");
  process.exit(0);
}

main();
