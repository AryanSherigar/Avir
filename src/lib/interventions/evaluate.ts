import rawEvidence from "../../../data/evidence.json";
import { calculateHouseholdExposure } from "../exposure";
import { HouseholdProfile, HourlyForecastPoint, EvidenceEntrySchema } from "../schemas";
import { InterventionRule } from "../schemas/interventions";
import {
  EvaluatedIntervention,
  PersonalProtectionResult,
  EnvironmentalContributionResult,
  PracticalityResult,
} from "../schemas/simulation";

const evidenceEntries = rawEvidence.map((e) => EvidenceEntrySchema.parse(e));

export function buildMapsDirectionsUrl(origin?: string, destination?: string): string | undefined {
  if (!origin || !destination) return undefined;
  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams({
    origin,
    destination,
    travelmode: "transit",
  });
  return `${baseUrl}&${params.toString()}`;
}

function resolveEvidence(evidenceRefs: string[]) {
  return evidenceRefs
    .map((ref) => evidenceEntries.find((e) => e.id === ref))
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .map((e) => ({
      id: e.id,
      sourceTitle: e.sourceTitle,
      claimSummary: e.claimSummary,
      limitations: e.limitations,
    }));
}

function applyTransportSwap(
  rule: InterventionRule,
  profile: HouseholdProfile
): { avoidedKm: number; transitUrl?: string } {
  let avoidedKm = 0;
  let transitUrl: string | undefined;

  if (rule.effectModifiers.replaceTransportWith !== "public_transit") {
    return { avoidedKm, transitUrl };
  }

  for (const act of profile.activities) {
    const isApplicable =
      act.transportMode &&
      rule.prerequisites.applicableTransport?.includes(act.transportMode);
    if (!isApplicable) continue;

    avoidedKm += act.commuteDistanceKm ?? 0;
    act.transportMode = "public_transit";
    if (!transitUrl && act.originLabel && act.destinationLabel) {
      transitUrl = buildMapsDirectionsUrl(act.originLabel, act.destinationLabel);
    }
  }

  return { avoidedKm, transitUrl };
}

function applySourceMitigations(
  ruleId: string,
  profile: HouseholdProfile
): boolean {
  if (ruleId === "eliminate_evening_incense") {
    profile.home.usesIncenseOrCoils = false;
    return true;
  }
  if (ruleId === "switch_solid_to_induction") {
    profile.home.cookingFuel = "electric_induction";
    return true;
  }
  if (ruleId === "exhaust_hood_cooking") {
    profile.home.hasOutdoorExhaust = true;
    return true;
  }
  return false;
}

function computePersonalProtection(
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

export function evaluateIntervention(
  rule: InterventionRule,
  profile: HouseholdProfile,
  hourlyForecast: HourlyForecastPoint[]
): EvaluatedIntervention {
  const lang = profile.constraints.preferredLanguage;
  const title = rule.title[lang] || rule.title.en;
  const description = rule.description[lang] || rule.description.en;

  const baseline = calculateHouseholdExposure(profile, hourlyForecast);
  const cloned: HouseholdProfile = JSON.parse(JSON.stringify(profile));

  const { avoidedKm, transitUrl } = applyTransportSwap(rule, cloned);
  const indoorSourceReduced = applySourceMitigations(rule.id, cloned);

  const infiltrationMultiplier = rule.effectModifiers.infiltrationMultiplier ?? 1.0;
  const maskMultiplier = rule.id === "n95_two_wheeler_commute" ? 0.4 : 1.0;

  const projected = calculateHouseholdExposure(cloned, hourlyForecast, {
    infiltrationMultiplier,
    maskMultiplier,
  });

  const personalProtection = computePersonalProtection(baseline, projected);

  const environmentalContribution: EnvironmentalContributionResult = {
    privateVehicleKmAvoidedPerDay: avoidedKm,
    indoorCombustionSourceReduced: indoorSourceReduced,
    summary: avoidedKm > 0
      ? `${avoidedKm.toFixed(1)} km of private vehicle travel avoided per day.`
      : indoorSourceReduced
      ? "Reduces localized indoor combustion emissions."
      : "No direct tailpipe emission impact.",
  };

  const cost = rule.practicality.estimatedCostInr;
  const time = rule.practicality.timeImpactMinutesPerDay;
  const withinHouseholdConstraints =
    cost <= profile.constraints.dailyBudgetInr &&
    time <= profile.constraints.maxExtraTimeMinutesPerDay;

  const practicality: PracticalityResult = {
    estimatedCostInr: cost,
    timeImpactMinutesPerDay: time,
    inconvenienceLevel: rule.practicality.inconvenienceLevel,
    withinHouseholdConstraints,
    mapsDirectionsUrl: transitUrl,
  };

  return {
    interventionId: rule.id,
    title,
    description,
    category: rule.category,
    personalProtection,
    environmentalContribution,
    practicality,
    evidence: resolveEvidence(rule.evidenceRefs),
    assumptions: [
      `Assumes 100% adherence to ${rule.id}.`,
      "Exposure proxy evaluated deterministically via physical infiltration and source models.",
    ],
  };
}
