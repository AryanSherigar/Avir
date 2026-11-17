import { describe, it, expect } from "vitest";
import {
  PersonalProtectionResultSchema,
  EnvironmentalContributionResultSchema,
  PracticalityResultSchema,
  EvaluatedInterventionSchema,
  SimulateRequestSchema,
  SimulationResultSchema,
} from "../src/lib/schemas/simulation";
import { HouseholdProfileSchema } from "../src/lib/schemas/household";

describe("Simulation Schemas", () => {
  it("validates valid PersonalProtectionResult", () => {
    const valid = {
      baselineHouseholdMean: 180.5,
      projectedHouseholdMean: 135.2,
      baselinePeakVulnerable: 240.0,
      projectedPeakVulnerable: 170.0,
      deltaPeakExposureProxy: -70.0,
      relativeReductionPercentRange: [20.5, 32.1] as [number, number],
      confidence: "high" as const,
    };
    expect(PersonalProtectionResultSchema.parse(valid)).toEqual(valid);
  });

  it("validates valid EnvironmentalContributionResult without fabricated grams", () => {
    const valid = {
      privateVehicleKmAvoidedPerDay: 25.5,
      indoorCombustionSourceReduced: true,
      summary: "25.5 km avoided by transit shift",
    };
    expect(EnvironmentalContributionResultSchema.parse(valid)).toEqual(valid);
  });

  it("validates valid PracticalityResult", () => {
    const valid = {
      estimatedCostInr: 60,
      timeImpactMinutesPerDay: 15,
      inconvenienceLevel: "medium" as const,
      withinHouseholdConstraints: true,
      mapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&origin=A&destination=B",
    };
    expect(PracticalityResultSchema.parse(valid)).toEqual(valid);
  });

  it("rejects invalid URLs in PracticalityResult", () => {
    const invalid = {
      estimatedCostInr: 60,
      timeImpactMinutesPerDay: 15,
      inconvenienceLevel: "medium" as const,
      withinHouseholdConstraints: true,
      mapsDirectionsUrl: "not-a-url",
    };
    expect(() => PracticalityResultSchema.parse(invalid)).toThrow();
  });
});
