import { describe, it, expect } from "vitest";
import {
  getPlanSystemInstruction,
  getChatSystemInstruction,
  formatPlanPrompt,
  sanitizeUserMessage,
} from "../src/lib/ai/prompts";
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

describe("AI System Instructions & Prompts", () => {
  const profile = defaultProfile;
  const context = demoAir as unknown as EnvironmentalContext;
  const baseline = calculateHouseholdExposure(profile, context.hourlyForecast);
  const applicable = getApplicableInterventions(profile);
  const evaluated = applicable.slice(0, 3).map((r) =>
    evaluateIntervention(r, profile, context.hourlyForecast)
  );

  it("includes scientific guardrails in English plan system instructions", () => {
    const enPlan = getPlanSystemInstruction("en");
    expect(enPlan).toContain("Never compute exposure numbers or percentage reductions");
    expect(enPlan).toContain("privateVehicleKmAvoidedPerDay");
    expect(enPlan).toContain("never invent tailpipe gram emission factors");
    expect(enPlan).toContain("Never provide medical diagnoses");
  });

  it("includes cultural Devanagari terminology in Hindi plan system instructions", () => {
    const hiPlan = getPlanSystemInstruction("hi");
    expect(hiPlan).toContain("स्मॉग");
    expect(hiPlan).toContain("अगरबत्ती");
  });

  it("includes tool rules in English and Hindi chat system instructions", () => {
    const enChat = getChatSystemInstruction("en");
    expect(enChat).toContain("get_household_exposure_breakdown");
    expect(enChat).toContain("privateVehicleKmAvoidedPerDay");

    const hiChat = getChatSystemInstruction("hi");
    expect(hiChat).toContain("स्मॉग सुरक्षा");
    expect(hiChat).toContain("वायु शोधक");
  });

  it("formats pre-computed metrics into compact JSON for Gemini", () => {
    const prompt = formatPlanPrompt(profile, baseline, evaluated, context, "en");
    expect(prompt).toContain(profile.householdName ?? "Sharma Family");
    expect(prompt).toContain("baselineHouseholdMean");
    expect(prompt).toContain("peakVulnerableMember");
    const parsed = JSON.parse(prompt);
    expect(parsed.householdName).toBe("Sharma Family");
    expect(parsed.city).toBe("Delhi");
    expect(parsed.preferredLanguage).toBe("en");
    expect(Array.isArray(parsed.topInterventions)).toBe(true);
  });

  it("formats Hindi plan prompt correctly", () => {
    const prompt = formatPlanPrompt(profile, baseline, evaluated, context, "hi");
    const parsed = JSON.parse(prompt);
    expect(parsed.preferredLanguage).toBe("hi");
  });

  it("sanitizes user message by truncating to 500 chars and stripping control chars", () => {
    const dirty = "Hello \x00\x08World! " + "x".repeat(600);
    const cleaned = sanitizeUserMessage(dirty);
    expect(cleaned.length).toBeLessThanOrEqual(500);
    expect(cleaned).not.toContain("\x00");
    expect(cleaned).not.toContain("\x08");
    expect(cleaned.startsWith("Hello World!")).toBe(true);
  });

  it("handles empty strings and preserves regular newlines and spaces", () => {
    expect(sanitizeUserMessage("")).toBe("");
    expect(sanitizeUserMessage("  Clean test message  ")).toBe("Clean test message");
    expect(sanitizeUserMessage("Line 1\nLine 2\tTabbed")).toBe("Line 1\nLine 2\tTabbed");
  });
});
