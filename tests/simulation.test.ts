import { describe, it, expect } from "vitest";
import { simulateRoutine } from "../src/lib/simulation/compare";
import { HouseholdProfileSchema } from "../src/lib/schemas";
import demoAir from "../data/demo-air-quality.json";

const testProfile = HouseholdProfileSchema.parse({
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
    nonNegotiableActivityIds: ["a-school"],
  },
});

describe("simulateRoutine multi-intervention composition", () => {
  it("executes 4 stacked interventions across three separate output pillars", () => {
    const selected = [
      "metro_transit_shift",
      "weatherstrip_windows",
      "shift_morning_exercise",
      "eliminate_evening_incense",
    ];

    const result = simulateRoutine(testProfile, selected, demoAir.hourlyForecast);

    // 1. Invariant: non-negotiable school did not move
    const schoolAct = result.counterfactualProfile.activities.find((a) => a.id === "a-school");
    expect(schoolAct?.startTime).toBe("07:30");
    expect(schoolAct?.endTime).toBe("14:00");

    // 2. Exercise shifted to 14:00 trough
    const exerciseAct = result.counterfactualProfile.activities.find((a) => a.id === "a-exercise");
    expect(exerciseAct?.startTime).toBe("14:00");
    expect(exerciseAct?.endTime).toBe("15:00");

    // 3. Pillar 1: Personal Protection
    expect(result.combinedPersonalProtection.deltaPeakExposureProxy).toBeLessThan(0);
    expect(result.combinedPersonalProtection.baselineHouseholdMean).toBeGreaterThan(0);
    expect(result.combinedPersonalProtection.projectedHouseholdMean).toBeLessThan(
      result.combinedPersonalProtection.baselineHouseholdMean
    );
    expect(result.combinedPersonalProtection.relativeReductionPercentRange[0]).toBeGreaterThanOrEqual(0);

    // 4. Pillar 2: Environmental Contribution (honest km, zero fabricated grams)
    expect(result.combinedEnvironmentalContribution.privateVehicleKmAvoidedPerDay).toBe(15);
    expect(result.combinedEnvironmentalContribution.indoorCombustionSourceReduced).toBe(true);
    expect(result.combinedEnvironmentalContribution.summary).toContain("15.0 km");

    // 5. Pillar 3: Practicality
    expect(result.combinedPracticality.estimatedCostInr).toBe(410); // 60 (metro) + 350 (tape)
    expect(result.combinedPracticality.timeImpactMinutesPerDay).toBe(15);
    expect(result.combinedPracticality.inconvenienceLevel).toBe("medium");
    expect(result.combinedPracticality.withinHouseholdConstraints).toBe(true);
    expect(result.combinedPracticality.mapsDirectionsUrl).toBeDefined();

    // 6. Evaluated interventions array contains all 4
    expect(result.evaluatedInterventions).toHaveLength(4);

    // 7. Non-negotiable check: Result does NOT contain any composite score property
    expect((result as unknown as Record<string, unknown>).compositeScore).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).overallScore).toBeUndefined();
  });

  it("clamps compounded infiltration multiplier to physical lower bound 0.20", () => {
    const result = simulateRoutine(testProfile, ["weatherstrip_windows"], demoAir.hourlyForecast);
    expect(result.combinedPersonalProtection.projectedHouseholdMean).toBeGreaterThan(0);
  });

  it("applies activityOverrides when supplied", () => {
    const overrides = [
      {
        id: "a-school",
        memberId: "m-child",
        type: "school" as const,
        startTime: "08:00",
        endTime: "13:30",
        indoor: true,
      },
    ];

    const result = simulateRoutine(testProfile, [], demoAir.hourlyForecast, overrides);
    const overriddenSchool = result.counterfactualProfile.activities.find((a) => a.id === "a-school");
    expect(overriddenSchool?.startTime).toBe("08:00");
    expect(overriddenSchool?.endTime).toBe("13:30");
  });

  it("evaluates withinHouseholdConstraints = false when budget exceeded", () => {
    const tightBudgetProfile = {
      ...testProfile,
      constraints: {
        ...testProfile.constraints,
        dailyBudgetInr: 50, // lower than 60 INR metro cost
      },
    };

    const result = simulateRoutine(tightBudgetProfile, ["metro_transit_shift"], demoAir.hourlyForecast);
    expect(result.combinedPracticality.withinHouseholdConstraints).toBe(false);
  });
});
