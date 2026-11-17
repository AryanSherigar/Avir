import { describe, it, expect } from "vitest";
import { validateObservation } from "../src/lib/air-quality/validation";

describe("Air Quality Observation Validation", () => {
  it("rejects non-positive PM2.5 readings", () => {
    const resZero = validateObservation({ pm25: 0, pm10: 50, observedAt: new Date().toISOString() });
    expect(resZero.isValid).toBe(false);
    expect(resZero.warnings).toContain("Invalid non-positive PM2.5 reading");

    const resNull = validateObservation({ pm25: null, pm10: 50, observedAt: new Date().toISOString() });
    expect(resNull.isValid).toBe(false);
  });

  it("rejects readings exceeding physical threshold of 1500 µg/m³", () => {
    const res = validateObservation({ pm25: 1501, pm10: 1600, observedAt: new Date().toISOString() });
    expect(res.isValid).toBe(false);
    expect(res.warnings).toContain("PM2.5 exceeds physical threshold of 1500 µg/m³");
  });

  it("rejects PM2.5 readings exceeding PM10 by more than 25% tolerance", () => {
    const res = validateObservation({ pm25: 200, pm10: 100, observedAt: new Date().toISOString() });
    expect(res.isValid).toBe(false);
    expect(res.warnings).toContain("PM2.5 exceeds PM10 by more than 25% tolerance (sensor anomaly)");
  });

  it("assigns high confidence for readings under 1 hour old", () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: recent });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.warnings).toHaveLength(0);
  });

  it("assigns medium confidence for readings between 1 and 3 hours old", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: twoHoursAgo });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("medium");
  });

  it("assigns low confidence and warning for readings older than 3 hours", () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: fourHoursAgo });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("low");
    expect(res.warnings).toContain("Station reading is older than 3 hours");
  });
});
