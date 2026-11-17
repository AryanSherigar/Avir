import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generatePlanExplanation, runChatLoop } from "../src/lib/ai/gemini";
import demoAir from "../data/demo-air-quality.json";
import { calculateHouseholdExposure } from "../src/lib/exposure";
import { evaluateIntervention, getApplicableInterventions } from "../src/lib/interventions";
import {
  EnvironmentalContext,
  HouseholdProfile,
  HouseholdProfileSchema,
} from "../src/lib/schemas";
import { GoogleGenAI } from "@google/genai";

vi.mock("@google/genai");

const testProfile: HouseholdProfile = HouseholdProfileSchema.parse({
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

describe("Server-Side Gemini AI Layer", () => {
  const context = demoAir as unknown as EnvironmentalContext;
  const baseline = calculateHouseholdExposure(testProfile, context.hourlyForecast);
  const applicable = getApplicableInterventions(testProfile);
  const evaluated = applicable.slice(0, 3).map((r) =>
    evaluateIntervention(r, testProfile, context.hourlyForecast)
  );

  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GEMINI_API_KEY = originalEnv;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  describe("Pattern A: Plan Explanation", () => {
    it("returns deterministic fallback with aiFallback: true when GEMINI_API_KEY is absent", async () => {
      const res = await generatePlanExplanation(testProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(true);
      expect(res.explanation.headline).toBeDefined();
      expect(res.explanation.householdRecommendations.length).toBeGreaterThan(0);
      expect(res.explanation.headline).toContain("Winter Smog Adaptation Plan");
    });

    it("returns Hindi deterministic fallback when preferredLanguage is 'hi' and GEMINI_API_KEY is absent", async () => {
      const hiProfile = {
        ...testProfile,
        constraints: { ...testProfile.constraints, preferredLanguage: "hi" as const },
      };
      const res = await generatePlanExplanation(hiProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(true);
      expect(res.explanation.headline).toContain("शीतकालीन स्मॉग");
    });

    it("calls Gemini and returns parsed response when GEMINI_API_KEY is present and response is valid", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockPlan = {
        headline: "Tailored Clean Air Strategy",
        executiveSummary: "Detailed mitigation roadmap for peak smog season.",
        vulnerableMemberAdvice: "Child should stay indoors during morning hours.",
        householdRecommendations: [
          {
            interventionId: "int-1",
            recommendationText: "Run HEPA filter in bedrooms",
            threePillarJustification: {
              protection: "Reduces PM2.5 proxy exposure by 40%.",
              contribution: "Zero direct emissions.",
              practicality: "Low running cost.",
            },
          },
        ],
        airQualityObservationSummary: "Anand Vihar PM2.5 at 220 ug/m3.",
        assumptionsAndCaveats: ["Environmental proxy values."],
      };

      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: JSON.stringify(mockPlan),
      });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const res = await generatePlanExplanation(testProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(false);
      expect(res.explanation.headline).toBe("Tailored Clean Air Strategy");
      expect(res.explanation.householdRecommendations).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("falls back to deterministic plan when Gemini returns invalid JSON", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: "NOT_JSON_AT_ALL",
      });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const res = await generatePlanExplanation(testProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(true);
      expect(res.explanation.headline).toContain("Winter Smog Adaptation Plan");
    });

    it("falls back to deterministic plan when Gemini API throws an error", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockRejectedValue(new Error("API rate limit exceeded"));

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const res = await generatePlanExplanation(testProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(true);
      expect(res.explanation.headline).toBeDefined();
    });

    it("falls back to deterministic plan when Gemini API times out (>8s)", async () => {
      vi.useFakeTimers();
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockImplementation(() => new Promise(() => {}));

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const planPromise = generatePlanExplanation(testProfile, baseline, evaluated, context);
      await vi.advanceTimersByTimeAsync(8500);
      const res = await planPromise;

      expect(res.aiFallback).toBe(true);
      expect(res.explanation.headline).toBeDefined();

      vi.useRealTimers();
    });

    it("handles response wrapped in markdown json fences", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockPlan = {
        headline: "Fenced Clean Air Strategy",
        executiveSummary: "Summary text.",
        vulnerableMemberAdvice: "Vulnerable advice.",
        householdRecommendations: [
          {
            interventionId: "int-1",
            recommendationText: "Recommendation",
            threePillarJustification: {
              protection: "Protection",
              contribution: "Contribution",
              practicality: "Practicality",
            },
          },
        ],
        airQualityObservationSummary: "Obs summary",
        assumptionsAndCaveats: ["Caveat"],
      };

      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: `\`\`\`json\n${JSON.stringify(mockPlan)}\n\`\`\``,
      });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const res = await generatePlanExplanation(testProfile, baseline, evaluated, context);
      expect(res.aiFallback).toBe(false);
      expect(res.explanation.headline).toBe("Fenced Clean Air Strategy");
    });
  });

  describe("Pattern B: Chat Loop", () => {
    it("runs chat loop returning fallback when GEMINI_API_KEY is absent", async () => {
      const chatRes = await runChatLoop(
        {
          profile: testProfile,
          message: "When should we jog today?",
          history: [],
        },
        context
      );
      expect(chatRes.aiFallback).toBe(true);
      expect(chatRes.response).toBeDefined();
      expect(chatRes.toolsUsed).toEqual([]);
    });

    it("returns direct text response when Gemini responds without tool calls", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: "I recommend jogging in the late afternoon when PM2.5 dips.",
        functionCalls: undefined,
      });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const chatRes = await runChatLoop(
        {
          profile: testProfile,
          message: "When is it safe to jog?",
          history: [],
        },
        context
      );

      expect(chatRes.aiFallback).toBe(false);
      expect(chatRes.response).toBe("I recommend jogging in the late afternoon when PM2.5 dips.");
      expect(chatRes.toolsUsed).toEqual([]);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("executes tool call and feeds result back to Gemini in multi-turn loop", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi
        .fn()
        .mockResolvedValueOnce({
          text: undefined,
          functionCalls: [
            {
              name: "get_cleanest_outdoor_windows",
              args: { durationHours: 2 },
            },
          ],
        })
        .mockResolvedValueOnce({
          text: "Based on forecast data, the cleanest window is 14:00 to 16:00.",
          functionCalls: undefined,
        });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const chatRes = await runChatLoop(
        {
          profile: testProfile,
          message: "Find cleanest 2 hours for exercise",
          history: [],
        },
        context
      );

      expect(chatRes.aiFallback).toBe(false);
      expect(chatRes.response).toBe("Based on forecast data, the cleanest window is 14:00 to 16:00.");
      expect(chatRes.toolsUsed).toEqual(["get_cleanest_outdoor_windows"]);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("terminates and returns completion response when 2 tool turns are exhausted", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi
        .fn()
        .mockResolvedValueOnce({
          text: undefined,
          functionCalls: [{ name: "get_household_exposure_breakdown", args: {} }],
        })
        .mockResolvedValueOnce({
          text: undefined,
          functionCalls: [{ name: "get_cleanest_outdoor_windows", args: { durationHours: 1 } }],
        });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const chatRes = await runChatLoop(
        {
          profile: testProfile,
          message: "Analyze exposure and cleanest windows",
          history: [],
        },
        context
      );

      expect(chatRes.aiFallback).toBe(false);
      expect(chatRes.response).toContain("Completed schedule analysis");
      expect(chatRes.toolsUsed).toEqual([
        "get_household_exposure_breakdown",
        "get_cleanest_outdoor_windows",
      ]);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("falls back to deterministic chat response when Gemini throws during chat loop", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockRejectedValue(new Error("Network timeout"));

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const chatRes = await runChatLoop(
        {
          profile: testProfile,
          message: "Help me plan outdoor commute",
          history: [],
        },
        context
      );

      expect(chatRes.aiFallback).toBe(true);
      expect(chatRes.response).toBeDefined();
    });

    it("windows chat history to the last 10 turns before forwarding to Gemini", async () => {
      process.env.GEMINI_API_KEY = "test-key";

      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: "Windowed history response",
        functionCalls: undefined,
      });

      vi.mocked(GoogleGenAI).mockImplementation(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      } as unknown as GoogleGenAI));

      const fifteenTurns = Array.from({ length: 15 }, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "model") as "user" | "model",
        text: `Message number ${i}`,
      }));

      await runChatLoop(
        {
          profile: testProfile,
          message: "Latest user prompt",
          history: fifteenTurns,
        },
        context
      );

      expect(mockGenerateContent).toHaveBeenCalled();
      const firstCall = mockGenerateContent.mock.calls[0];
      expect(firstCall).toBeDefined();
      const firstCallArgs = firstCall![0];
      // 10 history turns + 1 latest user prompt = 11 contents
      expect(firstCallArgs.contents).toHaveLength(11);
      // The oldest turn included should be turn 5 (15 - 10)
      expect(firstCallArgs.contents[0].parts[0].text).toBe("Message number 5");
      // The last content should be the latest user message
      expect(firstCallArgs.contents[10].parts[0].text).toBe("Latest user prompt");
    });
  });
});
