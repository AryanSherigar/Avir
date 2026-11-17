import { describe, it, expect } from "vitest";
import {
  getInfiltrationBand,
  calculateIndoorSource,
  calculateIndoorConcentration,
} from "@/lib/exposure/indoor-model";
import { HomeEnvironment } from "@/lib/schemas";

describe("Indoor Infiltration & Source Modeling", () => {
  const baseHome: HomeEnvironment = {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: false,
  };

  it("applies 50% reduction to infiltration band when air purifier is present", () => {
    const withoutPurifier = getInfiltrationBand(baseHome);
    const withPurifier = getInfiltrationBand({ ...baseHome, hasAirPurifier: true });

    expect(withoutPurifier).toEqual([0.6, 0.7, 0.8]);
    expect(withPurifier).toEqual([0.3, 0.35, 0.4]);
  });

  it("calculates cooking source with and without exhaust fan", () => {
    const withoutExhaust = calculateIndoorSource(baseHome, 12, true);
    const withExhaust = calculateIndoorSource({ ...baseHome, hasOutdoorExhaust: true }, 12, true);

    expect(withoutExhaust).toBe(45);
    expect(withExhaust).toBeCloseTo(45 * 0.35, 2);
  });

  it("adds incense emissions only during evening hours (18, 19, 20)", () => {
    const incenseHome = { ...baseHome, usesIncenseOrCoils: true };

    expect(calculateIndoorSource(incenseHome, 14, false)).toBe(0);
    expect(calculateIndoorSource(incenseHome, 18, false)).toBe(35);
    expect(calculateIndoorSource(incenseHome, 19, false)).toBe(35);
    expect(calculateIndoorSource(incenseHome, 20, false)).toBe(35);
    expect(calculateIndoorSource(incenseHome, 21, false)).toBe(0);
  });

  it("computes 3-point indoor concentration band correctly", () => {
    const outdoorPm25 = 200;
    const conc = calculateIndoorConcentration(outdoorPm25, baseHome, 10, false);

    expect(conc.low).toBeCloseTo(120, 2);
    expect(conc.central).toBeCloseTo(140, 2);
    expect(conc.high).toBeCloseTo(160, 2);
  });
});
