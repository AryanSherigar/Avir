import { HouseholdProfile } from "../schemas/household";
import { EnvironmentalContext } from "../schemas/air";
import { EvaluatedIntervention } from "../schemas/simulation";
import { HouseholdExposureResult } from "../exposure/calculate";

export function sanitizeUserMessage(input: string): string {
  const stripped = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return stripped.slice(0, 500);
}

export function getPlanSystemInstruction(language: "en" | "hi"): string {
  const commonGuardrails = `You are the Avir Decision-Support Engine synthesizing household winter smog adaptation plans.
SCIENTIFIC & AI GUARDRAILS:
1. ZERO ARITHMETIC: Never compute exposure numbers or percentage reductions. All numbers must originate strictly from the provided deterministic metrics.
2. HONEST ENVIRONMENTAL ACCOUNTING: Avoided private transport is strictly reported in privateVehicleKmAvoidedPerDay. You must never invent tailpipe gram emission factors.
3. NO MEDICAL DIAGNOSES: Never provide medical diagnoses or claim clinical lung dose reduction. Frame all exposure as environmental proxy values (µg/m³ · h).
4. THREE SEPARATE PILLARS: Maintain Personal Protection, Environmental Contribution, and Practicality separately. Never collapse them into one single composite score.`;

  if (language === "hi") {
    return `${commonGuardrails}
Respond strictly in natural Devanagari Hindi using authentic local terminology (गंभीर स्मॉग, धुआं, अगरबत्ती, मच्छर कॉइल, किचन एग्जॉस्ट, दोपहिया वाहन, मेट्रो यात्रा).
Return ONLY a valid JSON object matching the requested schema.`;
  }

  return `${commonGuardrails}
Respond in clear, empathetic, and scientifically rigorous English.
Return ONLY a valid JSON object matching the requested schema.`;
}

export function getChatSystemInstruction(language: "en" | "hi"): string {
  const common = `You are Avir, an intelligent conversational winter smog assistant for urban Indian households.
RULES:
1. Answer the user's smog adaptation questions concisely.
2. NEVER compute exposure math yourself. Always call tools (get_household_exposure_breakdown, simulate_custom_routine, get_cleanest_outdoor_windows) to obtain verified figures.
3. Ground transport reductions strictly in privateVehicleKmAvoidedPerDay. Do not invent gram emissions.
4. Frame advice around practical household steps (ventilation timing, HEPA usage, wet mopping, mask wearing, transit shifts).`;

  if (language === "hi") {
    return `${common}
Respond in natural, respectful Devanagari Hindi (नमस्ते, स्मॉग सुरक्षा, वायु शोधक).`;
  }

  return `${common}
Respond in clear, helpful, and empathetic English.`;
}

export function formatPlanPrompt(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext,
  language: "en" | "hi"
): string {
  const compactSummary = {
    householdName: profile.householdName ?? `${profile.location.city} Household`,
    city: profile.location.city,
    preferredLanguage: language,
    baselineHouseholdMean: Math.round(baseline.householdMeanExposure.centralEstimate),
    peakVulnerableMember: {
      role: baseline.peakVulnerableMember.roleLabel,
      baselineExposure: Math.round(baseline.peakVulnerableMember.exposure.centralEstimate),
    },
    currentOutdoorPm25: context.currentObservation?.pm25 ?? 0,
    observationSource: context.currentObservation?.source ?? "open_meteo",
    topInterventions: evaluated.slice(0, 5).map((e) => ({
      id: e.interventionId,
      title: e.title,
      peakReductionPct: e.personalProtection.relativeReductionPercentRange[1],
      avoidedKm: e.environmentalContribution.privateVehicleKmAvoidedPerDay,
      indoorCombustionReduced: e.environmentalContribution.indoorCombustionSourceReduced,
      costInr: e.practicality.estimatedCostInr,
      timeImpactMinutes: e.practicality.timeImpactMinutesPerDay,
      inconvenience: e.practicality.inconvenienceLevel,
    })),
  };

  return JSON.stringify(compactSummary, null, 2);
}
