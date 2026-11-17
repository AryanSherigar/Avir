import { HouseholdProfile } from "../schemas/household";
import { EnvironmentalContext } from "../schemas/air";
import { EvaluatedIntervention } from "../schemas/simulation";
import type { HouseholdExposureResult } from "../exposure/calculate";
import { PlanExplanation, ChatResponse, RecommendationCard } from "../schemas/ai";

function buildEnglishCards(evaluated: EvaluatedIntervention[]): RecommendationCard[] {
  return evaluated.map((item) => {
    const [minPct, maxPct] = item.personalProtection.relativeReductionPercentRange;
    const vehicleKm = item.environmentalContribution.privateVehicleKmAvoidedPerDay;
    const contributionText = vehicleKm > 0
      ? `Eliminates ${vehicleKm} km of private vehicle travel per day.`
      : item.environmentalContribution.summary;

    return {
      interventionId: item.interventionId,
      recommendationText: item.description,
      threePillarJustification: {
        protection: `Reduces peak personal exposure proxy by ${minPct}% - ${maxPct}%.`,
        contribution: contributionText,
        practicality: `Estimated cost: ₹${item.practicality.estimatedCostInr}. Time impact: ${item.practicality.timeImpactMinutesPerDay} min/day (${item.practicality.inconvenienceLevel} inconvenience).`,
      },
    };
  });
}

function buildHindiCards(evaluated: EvaluatedIntervention[]): RecommendationCard[] {
  return evaluated.map((item) => {
    const [minPct, maxPct] = item.personalProtection.relativeReductionPercentRange;
    const vehicleKm = item.environmentalContribution.privateVehicleKmAvoidedPerDay;
    const contributionText = vehicleKm > 0
      ? `प्रतिदिन ${vehicleKm} किमी निजी वाहन यात्रा से बचाव।`
      : "घरेलू उत्सर्जन में कटौती।";

    return {
      interventionId: item.interventionId,
      recommendationText: item.title,
      threePillarJustification: {
        protection: `व्यक्तिगत जोखिम में ${minPct}% से ${maxPct}% तक की कमी।`,
        contribution: contributionText,
        practicality: `अनुमानित लागत: ₹${item.practicality.estimatedCostInr}, समय प्रभाव: ${item.practicality.timeImpactMinutesPerDay} मिनट/दिन।`,
      },
    };
  });
}

function buildHindiPlanExplanation(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext
): PlanExplanation {
  const name = profile.householdName ?? profile.location.areaLabel ?? "घर";
  const outdoorPm = context.currentObservation?.pm25 ?? 180;
  const peakRole = baseline.peakVulnerableMember.roleLabel;
  const peakExposure = Math.round(baseline.peakVulnerableMember.exposure.centralEstimate);
  const meanExposure = Math.round(baseline.householdMeanExposure.centralEstimate);

  return {
    headline: `${name} शीतकालीन स्मॉग अनुकूलन योजना`,
    executiveSummary: `बाहरी PM2.5 स्तर लगभग ${outdoorPm} µg/m³ है। आपके घर का दैनिक औसत जोखिम स्तर लगभग ${meanExposure} µg/m³ · h है।`,
    vulnerableMemberAdvice: `परिवार के सबसे संवेदनशील सदस्य (${peakRole}) के लिए विशेष सुझाव: आधारभूत दैनिक जोखिम ${peakExposure} µg/m³ · h है। सुबह के समय बाहर जाने से बचें और इनडोर एयर प्यूरीफायर चालू रखें।`,
    householdRecommendations: buildHindiCards(evaluated),
    airQualityObservationSummary: `वर्तमान वायु गुणवत्ता प्रेक्षण: PM2.5 ${outdoorPm} µg/m³ (${context.currentObservation?.source ?? "मॉडल पूर्वानुमान"})।`,
    assumptionsAndCaveats: [
      "यह विश्लेषण वास्तविक नैदानिक फेफड़ों की खुराक नहीं, बल्कि पर्यावरणीय जोखिम प्रॉक्सी दर्शाता है।",
      "घर की इनडोर घुसपैठ दर (ACH) कमरे की बनावट के आधार पर भिन्न हो सकती है।",
    ],
  };
}

function buildEnglishPlanExplanation(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext
): PlanExplanation {
  const name = profile.householdName ?? profile.location.areaLabel ?? "Household";
  const outdoorPm = context.currentObservation?.pm25 ?? 180;
  const peakRole = baseline.peakVulnerableMember.roleLabel;
  const peakExposure = Math.round(baseline.peakVulnerableMember.exposure.centralEstimate);
  const meanExposure = Math.round(baseline.householdMeanExposure.centralEstimate);

  return {
    headline: `Winter Smog Adaptation Plan for ${name}`,
    executiveSummary: `Outdoor PM2.5 is currently ${outdoorPm} µg/m³. Household daily exposure proxy is estimated at ${meanExposure} µg/m³ · h.`,
    vulnerableMemberAdvice: `The highest risk is for ${peakRole} with a daily exposure proxy of ${peakExposure} µg/m³ · h. Prioritize indoor air filtering and avoid morning outdoor exertion.`,
    householdRecommendations: buildEnglishCards(evaluated),
    airQualityObservationSummary: `Current outdoor PM2.5 observation: ${outdoorPm} µg/m³ (${context.currentObservation?.source ?? "numerical forecast"}).`,
    assumptionsAndCaveats: [
      "All metrics reflect environmental exposure proxies (µg/m³ · h) rather than medical lung dose.",
      "Indoor PM2.5 concentrations assume baseline infiltration of 0.50 ACH unless otherwise configured.",
    ],
  };
}

export function generateDeterministicPlanExplanation(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext,
  language: "en" | "hi"
): PlanExplanation {
  if (language === "hi") {
    return buildHindiPlanExplanation(profile, baseline, evaluated, context);
  }
  return buildEnglishPlanExplanation(profile, baseline, evaluated, context);
}

function buildHindiChatResponse(pm: number): ChatResponse {
  return {
    response: `वर्तमान में वायु गुणवत्ता गंभीर स्तर पर है (PM2.5 लगभग ${pm} µg/m³)। सुबह 6:00 से 10:00 बजे के दौरान खिड़कियां बंद रखें और दोपहिया वाहन के बजाय मेट्रो या सार्वजनिक परिवहन का उपयोग करें।`,
    actionCards: [
      {
        actionId: "transit_switch",
        title: "सार्वजनिक परिवहन अपनाएं",
        description: "स्मॉग के चरम घंटों में दोपहिया वाहन से बचें।",
        impactSummary: "व्यक्तिगत जोखिम और वाहन उत्सर्जन दोनों कम करता है।",
      },
    ],
    toolsUsed: [],
    aiFallback: true,
  };
}

function buildEnglishChatResponse(pm: number): ChatResponse {
  return {
    response: `Current air quality shows elevated smog levels (PM2.5 around ${pm} µg/m³). We recommend keeping windows sealed during morning inversion hours (06:00 - 10:00) and shifting to public transit or carpooling.`,
    actionCards: [
      {
        actionId: "seal_windows_morning",
        title: "Seal Windows During Peak Inversion",
        description: "Prevent outdoor PM2.5 infiltration between 06:00 and 10:00.",
        impactSummary: "Significantly lowers baseline indoor exposure proxy.",
      },
    ],
    toolsUsed: [],
    aiFallback: true,
  };
}

export function generateDeterministicChatResponse(
  _profile: HouseholdProfile,
  _message: string,
  context: EnvironmentalContext,
  language: "en" | "hi"
): ChatResponse {
  const pm = context.currentObservation?.pm25 ?? 200;
  if (language === "hi") {
    return buildHindiChatResponse(pm);
  }
  return buildEnglishChatResponse(pm);
}
