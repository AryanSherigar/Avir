import { describe, it, expect } from "vitest";
import {
  RecommendationCardSchema,
  PlanExplanationSchema,
  PlanResponseSchema,
  ChatTurnSchema,
  ChatRequestSchema,
  ChatActionCardSchema,
  ChatResponseSchema,
} from "../src/lib/schemas/ai";
import demoAir from "../data/demo-air-quality.json";

const defaultProfile = {
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
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
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: false,
  },
  constraints: {
    dailyBudgetInr: 100,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: [],
  },
};

describe("AI Schemas", () => {
  it("validates a complete PlanExplanation object", () => {
    const validPlan = {
      headline: "Action Plan for High Smog Episode",
      executiveSummary: "Elevated outdoor PM2.5 requires indoor air management.",
      vulnerableMemberAdvice: "Child should avoid outdoor exertion before 11:00 AM.",
      householdRecommendations: [
        {
          interventionId: "hepa_purifier_living_room",
          recommendationText: "Operate HEPA air purifier continuously in the main bedroom.",
          threePillarJustification: {
            protection: "Reduces peak exposure proxy by 42%.",
            contribution: "Zero direct emissions added.",
            practicality: "Low daily maintenance cost.",
          },
        },
      ],
      airQualityObservationSummary: "Outdoor PM2.5 is currently 280 µg/m³ (Severe).",
      assumptionsAndCaveats: [
        "Infiltration assumed at 0.50 ACH.",
        "Outdoor forecast based on Open-Meteo numerical model.",
      ],
    };

    const parsed = PlanExplanationSchema.safeParse(validPlan);
    expect(parsed.success).toBe(true);
  });

  it("validates RecommendationCardSchema independently", () => {
    const card = {
      interventionId: "n95_mask",
      recommendationText: "Wear N95 during transit.",
      threePillarJustification: {
        protection: "Cuts inhaled PM2.5 by up to 80%.",
        contribution: "No environmental impact.",
        practicality: "Nominal cost per mask.",
      },
    };
    expect(RecommendationCardSchema.safeParse(card).success).toBe(true);

    const invalid = { ...card, threePillarJustification: { protection: "Good" } };
    expect(RecommendationCardSchema.safeParse(invalid).success).toBe(false);
  });

  it("validates PlanResponseSchema including default aiFallback", () => {
    const validResponse = {
      environmentalContext: demoAir,
      baselineHouseholdMean: 180.5,
      baselinePeakVulnerable: 240.0,
      peakVulnerableMemberRole: "Child",
      evaluatedInterventions: [],
      explanation: {
        headline: "Plan",
        executiveSummary: "Summary",
        vulnerableMemberAdvice: "Advice",
        householdRecommendations: [],
        airQualityObservationSummary: "Obs",
        assumptionsAndCaveats: [],
      },
    };

    const parsed = PlanResponseSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.aiFallback).toBe(false);
    }
  });

  it("validates ChatTurnSchema role and length limits", () => {
    expect(ChatTurnSchema.safeParse({ role: "user", text: "Hello" }).success).toBe(true);
    expect(ChatTurnSchema.safeParse({ role: "model", text: "Namaste" }).success).toBe(true);
    expect(ChatTurnSchema.safeParse({ role: "assistant", text: "Invalid role" }).success).toBe(false);
    expect(ChatTurnSchema.safeParse({ role: "user", text: "x".repeat(1001) }).success).toBe(false);
  });

  it("validates ChatRequest with sanitization constraints", () => {
    const validChatReq = {
      profile: defaultProfile,
      message: "When is the cleanest time for my morning jog?",
      history: [
        { role: "user", text: "Hello" },
        { role: "model", text: "Namaste! How can I assist you with smog adaptation?" },
      ],
    };

    const parsed = ChatRequestSchema.safeParse(validChatReq);
    expect(parsed.success).toBe(true);

    const emptyMsg = { ...validChatReq, message: "" };
    expect(ChatRequestSchema.safeParse(emptyMsg).success).toBe(false);

    const tooLongMsg = { ...validChatReq, message: "a".repeat(501) };
    expect(ChatRequestSchema.safeParse(tooLongMsg).success).toBe(false);

    // Default history is empty array
    const withoutHistory = {
      profile: defaultProfile,
      message: "Quick question",
    };
    const parsedDefaultHistory = ChatRequestSchema.safeParse(withoutHistory);
    expect(parsedDefaultHistory.success).toBe(true);
    if (parsedDefaultHistory.success) {
      expect(parsedDefaultHistory.data.history).toEqual([]);
    }

    // History bounded to max 20 turns
    const validHistory20 = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "model") as "user" | "model",
      text: `Turn ${i}`,
    }));
    expect(
      ChatRequestSchema.safeParse({
        ...validChatReq,
        history: validHistory20,
      }).success
    ).toBe(true);

    const invalidHistory21 = Array.from({ length: 21 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "model") as "user" | "model",
      text: `Turn ${i}`,
    }));
    expect(
      ChatRequestSchema.safeParse({
        ...validChatReq,
        history: invalidHistory21,
      }).success
    ).toBe(false);
  });

  it("validates ChatResponse and ActionCards", () => {
    const validChatRes = {
      response: "The cleanest window today is between 13:00 and 16:00.",
      actionCards: [
        {
          actionId: "shift_exercise_noon",
          title: "Shift Jogging to 13:00",
          description: "Move 45-minute outdoor exercise to the afternoon trough.",
          impactSummary: "Avoids peak morning smog concentrations.",
          selectedInterventionIds: ["time_shift_exercise"],
        },
      ],
      toolsUsed: ["get_cleanest_outdoor_windows"],
      aiFallback: false,
    };

    const parsed = ChatResponseSchema.safeParse(validChatRes);
    expect(parsed.success).toBe(true);

    // Test defaults for actionCards, toolsUsed, aiFallback
    const minimalChatRes = {
      response: "Hello there!",
    };
    const parsedMinimal = ChatResponseSchema.safeParse(minimalChatRes);
    expect(parsedMinimal.success).toBe(true);
    if (parsedMinimal.success) {
      expect(parsedMinimal.data.actionCards).toEqual([]);
      expect(parsedMinimal.data.toolsUsed).toEqual([]);
      expect(parsedMinimal.data.aiFallback).toBe(false);
    }
  });
});
