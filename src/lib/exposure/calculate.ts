import { HouseholdProfile, Member, HourlyForecastPoint } from "../schemas";
import { normalizeMemberSchedule, NormalizedHourSlot } from "./schedule";
import { calculateIndoorConcentration } from "./indoor-model";

export interface ExposureBand {
  lowEstimate: number;
  centralEstimate: number;
  highEstimate: number;
}

export interface HourlyExposureBreakdown extends ExposureBand {
  hourIndex: number;
  primaryActivityType: string;
}

export interface MemberExposureResult extends ExposureBand {
  memberId: string;
  roleLabel: string;
  category: Member["category"];
  isVulnerable: boolean;
  totalTimeHours: number;
  hourlyBreakdown: HourlyExposureBreakdown[];
}

export interface HouseholdExposureResult {
  memberExposures: Record<string, MemberExposureResult>;
  householdMeanExposure: ExposureBand;
  peakVulnerableMember: {
    memberId: string;
    roleLabel: string;
    exposure: ExposureBand;
  };
}

export interface ExposureCalculationOptions {
  infiltrationMultiplier?: number;
  maskMultiplier?: number;
}

function getTransportMultiplier(mode?: string): number {
  if (mode === "two_wheeler") return 1.15;
  if (mode === "car") return 0.85;
  return 1.0;
}

function computeSlotExposure(
  slot: NormalizedHourSlot | undefined,
  outdoorPm25: number,
  home: HouseholdProfile["home"],
  h: number,
  options?: ExposureCalculationOptions
): { low: number; central: number; high: number; time: number; primaryType: string } {
  let low = 0;
  let central = 0;
  let high = 0;
  let time = 0;
  let primaryType = "indoor_rest";
  let maxFraction = -1;

  if (!slot) {
    return { low, central, high, time, primaryType };
  }

  const infMult = options?.infiltrationMultiplier ?? 1.0;
  const maskMult = options?.maskMultiplier ?? 1.0;

  for (const act of slot.activities) {
    time += act.fraction;
    if (act.fraction > maxFraction) {
      maxFraction = act.fraction;
      primaryType = act.type;
    }

    if (act.indoor) {
      const isCooking = act.type === "cooking";
      const conc = calculateIndoorConcentration(outdoorPm25, home, h, isCooking, infMult);
      low += conc.low * act.fraction;
      central += conc.central * act.fraction;
      high += conc.high * act.fraction;
    } else {
      const isTwoWheelerOrWalk = act.transportMode === "two_wheeler" || act.transportMode === "walk_cycle";
      const personalMult = isTwoWheelerOrWalk ? maskMult : 1.0;
      const mult = getTransportMultiplier(act.transportMode);
      const outdoorConc = outdoorPm25 * mult * personalMult;
      low += outdoorConc * act.fraction;
      central += outdoorConc * act.fraction;
      high += outdoorConc * act.fraction;
    }
  }

  return { low, central, high, time, primaryType };
}

function computeMemberResult(
  member: Member,
  profile: HouseholdProfile,
  hourlyForecast: HourlyForecastPoint[],
  options?: ExposureCalculationOptions
): MemberExposureResult {
  const memberActivities = profile.activities.filter((a) => a.memberId === member.id);
  const slots = normalizeMemberSchedule(memberActivities);

  let memberLow = 0;
  let memberCentral = 0;
  let memberHigh = 0;
  let memberTime = 0;
  const hourlyBreakdown: HourlyExposureBreakdown[] = [];

  for (let h = 0; h < 24; h++) {
    const forecastPoint = hourlyForecast[h];
    const outdoorPm25 = forecastPoint?.pm25 ?? 150;
    const slotData = computeSlotExposure(slots[h], outdoorPm25, profile.home, h, options);

    memberTime += slotData.time;
    memberLow += slotData.low;
    memberCentral += slotData.central;
    memberHigh += slotData.high;

    hourlyBreakdown.push({
      hourIndex: h,
      lowEstimate: slotData.low,
      centralEstimate: slotData.central,
      highEstimate: slotData.high,
      primaryActivityType: slotData.primaryType,
    });
  }

  const isVulnerable = member.category !== "adult" || member.outdoorSensitivity === "higher";

  return {
    memberId: member.id,
    roleLabel: member.roleLabel,
    category: member.category,
    isVulnerable,
    totalTimeHours: memberTime,
    lowEstimate: memberLow,
    centralEstimate: memberCentral,
    highEstimate: memberHigh,
    hourlyBreakdown,
  };
}

export function calculateHouseholdExposure(
  profile: HouseholdProfile,
  hourlyForecast: HourlyForecastPoint[],
  options?: ExposureCalculationOptions
): HouseholdExposureResult {
  const memberExposures: Record<string, MemberExposureResult> = {};
  let totalMeanLow = 0;
  let totalMeanCentral = 0;
  let totalMeanHigh = 0;

  for (const member of profile.members) {
    const result = computeMemberResult(member, profile, hourlyForecast, options);
    memberExposures[member.id] = result;
    totalMeanLow += result.lowEstimate;
    totalMeanCentral += result.centralEstimate;
    totalMeanHigh += result.highEstimate;
  }

  const memberCount = Math.max(1, profile.members.length);
  const householdMeanExposure: ExposureBand = {
    lowEstimate: totalMeanLow / memberCount,
    centralEstimate: totalMeanCentral / memberCount,
    highEstimate: totalMeanHigh / memberCount,
  };

  const vulnerableResults = Object.values(memberExposures).filter((m) => m.isVulnerable);
  const candidatePool = vulnerableResults.length > 0 ? vulnerableResults : Object.values(memberExposures);

  let peak = candidatePool[0] ?? {
    memberId: "unknown",
    roleLabel: "Unknown",
    lowEstimate: 0,
    centralEstimate: 0,
    highEstimate: 0,
  };

  for (const candidate of candidatePool) {
    if (candidate.centralEstimate > peak.centralEstimate) {
      peak = candidate;
    }
  }

  return {
    memberExposures,
    householdMeanExposure,
    peakVulnerableMember: {
      memberId: peak.memberId,
      roleLabel: peak.roleLabel,
      exposure: {
        lowEstimate: peak.lowEstimate,
        centralEstimate: peak.centralEstimate,
        highEstimate: peak.highEstimate,
      },
    },
  };
}
