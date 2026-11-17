import { describe, it, expect } from "vitest";
import {
  generateDeterministicPlanExplanation,
  generateDeterministicChatResponse,
} from "../src/lib/ai/fallback";
import { PlanExplanationSchema, ChatResponseSchema } from "../src/lib/schemas/ai";
import demoAir from "../data/demo-air-quality.json";
import { calculateHouseholdExposure } from "../src/lib/exposure";
import { evaluateIntervention, getApplicableInterventions } from "../src/lib/interventions";
import {
  EnvironmentalContext,
  HouseholdProfile,
  HouseholdProfileSchema,
} from "../src/lib/schemas";

const defaultProfile: HouseholdProfile = HouseholdProfileSchema.parse({
  householdName: "Sharma Family",
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-parent", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
  ],
  activities: [
    {
      id: "a-school",
      memberId: "m-child",
      type: "school",
      startTime: "07:30",
      endTime: "14:00",
      indoor: true,
    },
    {
      id: "a-exercise",
      memberId: "m-parent",
      type: "exercise",
      startTime: "06:00",
      endTime: "07:00",
      indoor: false,
    },
    {
      id: "a-commute",
      memberId: "m-parent",
      type: "work",
      startTime: "08:15",
      endTime: "09:15",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
      originLabel: "Anand Vihar",
      destinationLabel: "Connaught Place",
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
    nonNegotiableActivityIds: ["a-school", "a-commute"],
  },
});

describe("Deterministic AI Fallbacks", () => {
  const profile = defaultProfile;
  const context = demoAir as unknown as EnvironmentalContext;
  const baseline = calculateHouseholdExposure(profile, context.hourlyForecast);
  const applicable = getApplicableInterventions(profile);
  const evaluated = applicable.slice(0, 3).map((r) =>
    evaluateIntervention(r, profile, context.hourlyForecast)
  );

  it("generates 100% valid English PlanExplanation with full three-pillar cards", () => {
    const explanation = generateDeterministicPlanExplanation(
      profile,
      baseline,
      evaluated,
      context,
      "en"
    );
    const parsed = PlanExplanationSchema.safeParse(explanation);
    expect(parsed.success).toBe(true);
    expect(explanation.householdRecommendations.length).toBeGreaterThan(0);
    expect(explanation.headline).toContain("Winter Smog Adaptation Plan");
    const firstCard = explanation.householdRecommendations[0];
    expect(firstCard).toBeDefined();
    if (!firstCard) throw new Error("Missing recommendation card");
    expect(firstCard.threePillarJustification.protection).toBeTruthy();
    expect(firstCard.threePillarJustification.contribution).toBeTruthy();
    expect(firstCard.threePillarJustification.practicality).toBeTruthy();
  });

  it("generates 100% valid Hindi PlanExplanation in Devanagari", () => {
    const explanation = generateDeterministicPlanExplanation(
      profile,
      baseline,
      evaluated,
      context,
      "hi"
    );
    const parsed = PlanExplanationSchema.safeParse(explanation);
    expect(parsed.success).toBe(true);
    expect(explanation.headline).toContain("शीतकालीन स्मॉग अनुकूलन योजना");
    expect(explanation.vulnerableMemberAdvice).toContain("सुझाव");
    expect(explanation.householdRecommendations.length).toBeGreaterThan(0);
  });

  it("generates valid deterministic ChatResponse for English queries", () => {
    const res = generateDeterministicChatResponse(
      profile,
      "What should I do during morning smog?",
      context,
      "en"
    );
    const parsed = ChatResponseSchema.safeParse(res);
    expect(parsed.success).toBe(true);
    expect(res.aiFallback).toBe(true);
    expect(res.actionCards.length).toBeGreaterThan(0);
  });

  it("generates valid deterministic ChatResponse for Hindi queries", () => {
    const res = generateDeterministicChatResponse(
      profile,
      "सुबह के स्मॉग में मुझे क्या करना चाहिए?",
      context,
      "hi"
    );
    const parsed = ChatResponseSchema.safeParse(res);
    expect(parsed.success).toBe(true);
    expect(res.aiFallback).toBe(true);
    expect(res.response).toContain("वायु गुणवत्ता");
  });

  it("handles null pm25 observation gracefully", () => {
    const contextWithNullPm: EnvironmentalContext = {
      ...context,
      currentObservation: {
        ...context.currentObservation,
        pm25: null,
      },
    };
    const explanation = generateDeterministicPlanExplanation(
      profile,
      baseline,
      evaluated,
      contextWithNullPm,
      "en"
    );
    expect(PlanExplanationSchema.safeParse(explanation).success).toBe(true);

    const chatRes = generateDeterministicChatResponse(
      profile,
      "Is it safe outside?",
      contextWithNullPm,
      "en"
    );
    expect(ChatResponseSchema.safeParse(chatRes).success).toBe(true);
  });
});
