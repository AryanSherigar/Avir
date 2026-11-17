import { describe, it, expect } from "vitest";
import { createChatToolExecutor, CHAT_TOOL_DECLARATIONS } from "../src/lib/ai/tools";
import demoAir from "../data/demo-air-quality.json";
import {
  HouseholdProfile,
  EnvironmentalContext,
  HouseholdProfileSchema,
} from "../src/lib/schemas";

const defaultProfile: HouseholdProfile = HouseholdProfileSchema.parse({
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
});

describe("Deterministic Chat Tools", () => {
  const profile = defaultProfile;
  const context = demoAir as unknown as EnvironmentalContext;
  const executeTool = createChatToolExecutor(profile, context);

  it("exports valid Gemini tool declarations", () => {
    expect(CHAT_TOOL_DECLARATIONS.length).toBe(3);
    const names = CHAT_TOOL_DECLARATIONS.map((t) => t.name);
    expect(names).toContain("get_household_exposure_breakdown");
    expect(names).toContain("simulate_custom_routine");
    expect(names).toContain("get_cleanest_outdoor_windows");
  });

  it("executes get_household_exposure_breakdown deterministically", async () => {
    const raw = await executeTool("get_household_exposure_breakdown", {});
    const parsed = JSON.parse(raw);
    expect(parsed.householdMean).toBeDefined();
    expect(typeof parsed.householdMean).toBe("number");
    expect(parsed.members).toBeDefined();
    expect(parsed.members.length).toBe(profile.members.length);
    expect(parsed.peakVulnerableMember).toBeDefined();
    expect(parsed.peakVulnerableMember.role).toBe("Child");
  });

  it("executes get_cleanest_outdoor_windows and returns valid hour range", async () => {
    const raw = await executeTool("get_cleanest_outdoor_windows", { durationHours: 2 });
    const parsed = JSON.parse(raw);
    expect(parsed.startHour).toBeDefined();
    expect(parsed.endHour).toBeDefined();
    expect(parsed.durationHours).toBe(2);
    expect(parsed.averagePm25).toBeGreaterThan(0);
  });

  it("clamps get_cleanest_outdoor_windows duration within bounds [1, 8]", async () => {
    const rawClampedHigh = await executeTool("get_cleanest_outdoor_windows", { durationHours: 24 });
    const parsedHigh = JSON.parse(rawClampedHigh);
    expect(parsedHigh.durationHours).toBe(8);

    const rawClampedLow = await executeTool("get_cleanest_outdoor_windows", { durationHours: -3 });
    const parsedLow = JSON.parse(rawClampedLow);
    expect(parsedLow.durationHours).toBe(1);

    const rawDefault = await executeTool("get_cleanest_outdoor_windows", {});
    const parsedDefault = JSON.parse(rawDefault);
    expect(parsedDefault.durationHours).toBe(1);
  });

  it("executes simulate_custom_routine returning 3-pillar metrics", async () => {
    const raw = await executeTool("simulate_custom_routine", {
      selectedInterventionIds: ["weatherstrip_windows"],
    });
    const parsed = JSON.parse(raw);
    expect(parsed.personalProtection).toBeDefined();
    expect(parsed.environmentalContribution).toBeDefined();
    expect(parsed.practicality).toBeDefined();
  });

  it("handles empty or non-array selectedInterventionIds safely", async () => {
    const raw = await executeTool("simulate_custom_routine", {
      selectedInterventionIds: "invalid",
    });
    const parsed = JSON.parse(raw);
    expect(parsed.personalProtection).toBeDefined();
    expect(parsed.environmentalContribution).toBeDefined();
    expect(parsed.practicality).toBeDefined();
  });

  it("handles unknown tool gracefully", async () => {
    const raw = await executeTool("unknown_tool", {});
    const parsed = JSON.parse(raw);
    expect(parsed.error).toContain("Unknown tool");
  });

  it("catches errors and returns JSON error object", async () => {
    const faultyProfile = { ...profile, members: null as unknown as typeof profile.members };
    const faultyExecutor = createChatToolExecutor(faultyProfile, context);
    const raw = await faultyExecutor("get_household_exposure_breakdown", {});
    const parsed = JSON.parse(raw);
    expect(parsed.error).toBeDefined();
    expect(typeof parsed.error).toBe("string");
  });
});
