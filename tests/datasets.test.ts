import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  EnvironmentalContextSchema,
  InterventionRuleSchema,
  EvidenceEntrySchema,
} from "@/lib/schemas";
import demoAirQuality from "../data/demo-air-quality.json";
import interventions from "../data/interventions.json";
import evidence from "../data/evidence.json";

describe("Static Datasets Validation", () => {
  it("validates demo-air-quality.json against EnvironmentalContextSchema", () => {
    const parsed = EnvironmentalContextSchema.safeParse(demoAirQuality);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(demoAirQuality.currentObservation.source).toBe("demo");
    expect(demoAirQuality.hourlyForecast).toHaveLength(24);
  });

  it("validates interventions.json has at least 8 valid rules", () => {
    const ListSchema = z.array(InterventionRuleSchema);
    const parsed = ListSchema.safeParse(interventions);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(interventions.length).toBeGreaterThanOrEqual(8);
  });

  it("validates evidence.json citations match intervention evidenceRefs", () => {
    const ListSchema = z.array(EvidenceEntrySchema);
    const parsed = ListSchema.safeParse(evidence);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

    const evidenceIds = new Set(evidence.map((e) => e.id));
    for (const rule of interventions) {
      for (const ref of rule.evidenceRefs) {
        expect(evidenceIds.has(ref), `Missing evidence ref '${ref}' in rule ${rule.id}`).toBe(true);
      }
    }
  });
});
