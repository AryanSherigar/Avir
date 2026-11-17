import { describe, it, expect } from "vitest";
import {
  HouseholdProfileSchema,
  EnvironmentalContextSchema,
} from "@/lib/schemas";

describe("Domain Schemas", () => {
  it("validates a valid Delhi household profile", () => {
    const validProfile = {
      location: {
        city: "Delhi",
        latitude: 28.6139,
        longitude: 77.209,
      },
      members: [
        {
          id: "m1",
          roleLabel: "Child",
          category: "child",
          outdoorSensitivity: "higher",
        },
      ],
      activities: [
        {
          id: "a1",
          memberId: "m1",
          type: "school",
          startTime: "08:00",
          endTime: "14:00",
          indoor: true,
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
        dailyBudgetInr: 200,
        maxExtraTimeMinutesPerDay: 30,
        preferredLanguage: "en",
        nonNegotiableActivityIds: [],
      },
    };

    const parsed = HouseholdProfileSchema.safeParse(validProfile);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid time format and out-of-bounds coordinates", () => {
    const invalidProfile = {
      location: { city: "Delhi", latitude: 120.0, longitude: 77.209 },
      members: [],
      activities: [
        {
          id: "a1",
          memberId: "m1",
          type: "school",
          startTime: "25:00",
          endTime: "14:00",
          indoor: true,
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
        dailyBudgetInr: -50,
        maxExtraTimeMinutesPerDay: 30,
        preferredLanguage: "en",
        nonNegotiableActivityIds: [],
      },
    };

    const parsed = HouseholdProfileSchema.safeParse(invalidProfile);
    expect(parsed.success).toBe(false);
  });

  it("validates environmental context with exactly 24 hourly forecast points", () => {
    const validContext = {
      currentObservation: {
        stationName: "Anand Vihar, Delhi",
        city: "Delhi",
        source: "cpcb",
        observedAt: "2026-11-17T18:00:00Z",
        pm25: 350,
        pm10: 480,
        no2: 85,
        officialNaqi: 412,
        confidence: "high",
      },
      hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
        hourIndex: i,
        isoTime: `2026-11-17T${String(i).padStart(2, "0")}:00:00Z`,
        pm25: 250 + i * 2,
        pm10: 380 + i * 3,
      })),
      dataQualityWarnings: [],
      isDemoFallback: false,
    };

    const parsed = EnvironmentalContextSchema.safeParse(validContext);
    expect(parsed.success).toBe(true);
  });
});
