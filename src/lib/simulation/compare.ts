import { z } from "zod";
import { calculateHouseholdExposure } from "../exposure";
import { getInterventionById, evaluateIntervention, buildMapsDirectionsUrl } from "../interventions";
import { Activity, ActivityType, HouseholdProfile } from "../schemas/household";
import { HourlyForecastPoint } from "../schemas/air";
import { InconvenienceLevelSchema } from "../schemas/interventions";
import {
  SimulationResult,
  PersonalProtectionResult,
  EnvironmentalContributionResult,
  PracticalityResult,
} from "../schemas/simulation";
import { shiftActivitiesToCleanestWindow } from "./time-shift";

type InconvenienceLevel = z.infer<typeof InconvenienceLevelSchema>;

const INCONVENIENCE_ORDER: Record<InconvenienceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function resolveHighestInconvenience(levels: InconvenienceLevel[]): InconvenienceLevel {
  let highest: InconvenienceLevel = "low";
  for (const lvl of levels) {
    const lvlScore = INCONVENIENCE_ORDER[lvl] ?? 1;
    const highestScore = INCONVENIENCE_ORDER[highest] ?? 1;
    if (lvlScore > highestScore) {
      highest = lvl;
    }
  }
  return highest;
}

function applyActivityOverrides(activities: Activity[], overrides?: Activity[]): Activity[] {
  if (!overrides || overrides.length === 0) return activities;
  const overrideMap = new Map(overrides.map((o) => [o.id, o]));
  return activities.map((act) => overrideMap.get(act.id) ?? act);
}

function applyScheduleShifts(
  profile: HouseholdProfile,
  rules: ReturnType<typeof getInterventionById>[],
  hourlyForecast: HourlyForecastPoint[]
): void {
  const targetShiftTypes: ActivityType[] = [];
  for (const r of rules) {
    if (!r?.effectModifiers.shiftActivityTypesToLowestPmWindow) continue;
    targetShiftTypes.push(...r.effectModifiers.shiftActivityTypesToLowestPmWindow);
  }

  if (targetShiftTypes.length > 0) {
    profile.activities = shiftActivitiesToCleanestWindow(
      profile.activities,
      targetShiftTypes,
      hourlyForecast,
      profile.constraints.nonNegotiableActivityIds
    );
  }
}

function applyTransitSwaps(
  profile: HouseholdProfile,
  rules: ReturnType<typeof getInterventionById>[]
): { totalAvoidedKm: number; transitUrl?: string } {
  let totalAvoidedKm = 0;
  let transitUrl: string | undefined;

  const transitRule = rules.find(
    (r) => r?.effectModifiers.replaceTransportWith === "public_transit"
  );
  if (!transitRule) return { totalAvoidedKm, transitUrl };

  for (const act of profile.activities) {
    const isApplicable =
      act.transportMode &&
      transitRule.prerequisites.applicableTransport?.includes(act.transportMode);
    if (!isApplicable) continue;

    totalAvoidedKm += act.commuteDistanceKm ?? 0;
    act.transportMode = "public_transit";
    if (!transitUrl && act.originLabel && act.destinationLabel) {
      transitUrl = buildMapsDirectionsUrl(act.originLabel, act.destinationLabel);
    }
  }

  return { totalAvoidedKm, transitUrl };
}

function applyEnvironmentalModifiers(
  profile: HouseholdProfile,
  rules: ReturnType<typeof getInterventionById>[]
): { compoundedInfiltration: number; indoorSourceReduced: boolean; maskActive: boolean } {
  let compoundedInfiltration = 1.0;
  let indoorSourceReduced = false;
  let maskActive = false;

  for (const r of rules) {
    if (!r) continue;
    if (r.effectModifiers.infiltrationMultiplier) {
      compoundedInfiltration *= r.effectModifiers.infiltrationMultiplier;
    }
    if (r.id === "eliminate_evening_incense") {
      profile.home.usesIncenseOrCoils = false;
      indoorSourceReduced = true;
    }
    if (r.id === "switch_solid_to_induction") {
      profile.home.cookingFuel = "electric_induction";
      indoorSourceReduced = true;
    }
    if (r.id === "exhaust_hood_cooking") {
      profile.home.hasOutdoorExhaust = true;
      indoorSourceReduced = true;
    }
    if (r.id === "n95_two_wheeler_commute") {
      maskActive = true;
    }
  }

  compoundedInfiltration = Math.max(0.20, Math.min(1.0, compoundedInfiltration));
  return { compoundedInfiltration, indoorSourceReduced, maskActive };
}

function computeCombinedPersonalProtection(
  baseline: ReturnType<typeof calculateHouseholdExposure>,
  projected: ReturnType<typeof calculateHouseholdExposure>
): PersonalProtectionResult {
  const baseMean = Number(baseline.householdMeanExposure.centralEstimate.toFixed(1));
  const projMean = Number(projected.householdMeanExposure.centralEstimate.toFixed(1));
  const basePeak = Number(baseline.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const projPeak = Number(projected.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const deltaPeak = Number((projPeak - basePeak).toFixed(1));

  const relLow = Math.max(
    0,
    ((baseline.householdMeanExposure.lowEstimate - projected.householdMeanExposure.lowEstimate) /
      Math.max(1, baseline.householdMeanExposure.lowEstimate)) * 100
  );
  const relHigh = Math.max(
    0,
    ((baseline.householdMeanExposure.highEstimate - projected.householdMeanExposure.highEstimate) /
      Math.max(1, baseline.householdMeanExposure.highEstimate)) * 100
  );

  return {
    baselineHouseholdMean: baseMean,
    projectedHouseholdMean: projMean,
    baselinePeakVulnerable: basePeak,
    projectedPeakVulnerable: projPeak,
    deltaPeakExposureProxy: deltaPeak,
    relativeReductionPercentRange: [
      Number(Math.min(relLow, relHigh).toFixed(1)),
      Number(Math.max(relLow, relHigh).toFixed(1)),
    ],
    confidence: "high",
  };
}

export function simulateRoutine(
  profile: HouseholdProfile,
  selectedInterventionIds: string[],
  hourlyForecast: HourlyForecastPoint[],
  activityOverrides?: Activity[]
): SimulationResult {
  const cloned: HouseholdProfile = JSON.parse(JSON.stringify(profile));
  cloned.activities = applyActivityOverrides(cloned.activities, activityOverrides);

  const baseline = calculateHouseholdExposure(profile, hourlyForecast);
  const rules = selectedInterventionIds
    .map((id) => getInterventionById(id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  // Stage 1: Schedule Adjustments
  applyScheduleShifts(cloned, rules, hourlyForecast);

  // Stage 2: Transport Swaps & Sum Avoided Km
  const { totalAvoidedKm, transitUrl } = applyTransitSwaps(cloned, rules);

  // Stage 3: Compounding Environmental Modifiers
  const { compoundedInfiltration, indoorSourceReduced, maskActive } =
    applyEnvironmentalModifiers(cloned, rules);

  // Stage 4: Deterministic Exposure Re-evaluation & Three Separate Output Pillars
  const projected = calculateHouseholdExposure(cloned, hourlyForecast, {
    infiltrationMultiplier: compoundedInfiltration,
    maskMultiplier: maskActive ? 0.4 : 1.0,
  });

  const combinedPersonalProtection = computeCombinedPersonalProtection(baseline, projected);

  const combinedEnvironmentalContribution: EnvironmentalContributionResult = {
    privateVehicleKmAvoidedPerDay: totalAvoidedKm,
    indoorCombustionSourceReduced: indoorSourceReduced,
    summary: totalAvoidedKm > 0
      ? `${totalAvoidedKm.toFixed(1)} km private vehicle travel avoided per day by shifting to transit.`
      : indoorSourceReduced
      ? "Indoor combustion sources eliminated or vented."
      : "No direct emission reduction.",
  };

  const totalCost = rules.reduce((sum, r) => sum + r.practicality.estimatedCostInr, 0);
  const totalTime = rules.reduce((sum, r) => sum + r.practicality.timeImpactMinutesPerDay, 0);
  const highestInconvenience = resolveHighestInconvenience(
    rules.map((r) => r.practicality.inconvenienceLevel)
  );

  const withinHouseholdConstraints =
    totalCost <= profile.constraints.dailyBudgetInr &&
    totalTime <= profile.constraints.maxExtraTimeMinutesPerDay;

  const combinedPracticality: PracticalityResult = {
    estimatedCostInr: totalCost,
    timeImpactMinutesPerDay: totalTime,
    inconvenienceLevel: highestInconvenience,
    withinHouseholdConstraints,
    mapsDirectionsUrl: transitUrl,
  };

  const evaluatedInterventions = rules.map((r) =>
    evaluateIntervention(r, profile, hourlyForecast)
  );

  return {
    counterfactualProfile: cloned,
    evaluatedInterventions,
    combinedPersonalProtection,
    combinedEnvironmentalContribution,
    combinedPracticality,
    assumptions: [
      "Simulation assumes 100% adherence to all selected interventions.",
      "Compounded infiltration factor is physically clamped to >= 0.20.",
      "Avoided vehicle emissions count only converted private motorized kilometers.",
    ],
  };
}
