import { describe, it, expect } from "vitest";
import { calculateHouseholdExposure } from "@/lib/exposure/calculate";
import { HouseholdProfile, HourlyForecastPoint } from "@/lib/schemas";

describe("Household Exposure Calculator", () => {
  const forecast: HourlyForecastPoint[] = Array.from({ length: 24 }, (_, i) => ({
    hourIndex: i,
    isoTime: `2026-11-17T${String(i).padStart(2, "0")}:00:00Z`,
    pm25: 200,
    pm10: 300,
  }));

  const profile: HouseholdProfile = {
    location: { city: "Delhi", latitude: 28.61, longitude: 77.2 },
    members: [
      { id: "child-1", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
      { id: "parent-1", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
    ],
    activities: [
      {
        id: "a1",
        memberId: "parent-1",
        type: "work",
        startTime: "09:00",
        endTime: "10:00",
        indoor: false,
        transportMode: "two_wheeler",
      },
    ],
    home: {
      ventilation: "moderate",
      cookingFuel: "lpg",
      hasOutdoorExhaust: true,
      hasAirPurifier: false,
      usesIncenseOrCoils: false,
    },
    constraints: {
      dailyBudgetInr: 100,
      maxExtraTimeMinutesPerDay: 20,
      preferredLanguage: "en",
      nonNegotiableActivityIds: [],
    },
  };

  it("calculates member exposures and correctly tags peak vulnerable member", () => {
    const result = calculateHouseholdExposure(profile, forecast);

    expect(result.memberExposures["child-1"]).toBeDefined();
    expect(result.memberExposures["parent-1"]).toBeDefined();
    expect(result.peakVulnerableMember.memberId).toBe("child-1");
    expect(result.householdMeanExposure.centralEstimate).toBeGreaterThan(0);
  });

  it("applies 1.15 multiplier to two-wheeler commute", () => {
    const result = calculateHouseholdExposure(profile, forecast);
    const parentExp = result.memberExposures["parent-1"];
    expect(parentExp).toBeDefined();

    const hour9 = parentExp?.hourlyBreakdown[9];
    // Hour 9 has 1 hour of two-wheeler commute at outdoor 200 => 200 * 1.15 = 230
    expect(hour9?.centralEstimate).toBeCloseTo(230, 1);
  });
});
