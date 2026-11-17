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

  it("enforces upper bounds on members, activities, and non-negotiables to prevent DoS", () => {
    const baseProfile = {
      location: { city: "Delhi", latitude: 28.6139, longitude: 77.209 },
      members: [
        { id: "m1", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
      ],
      activities: [
        { id: "a1", memberId: "m1", type: "school", startTime: "08:00", endTime: "14:00", indoor: true },
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

    // Rejects more than 20 members
    const twentyOneMembers = Array.from({ length: 21 }, (_, i) => ({
      id: `m${i}`,
      roleLabel: `Member ${i}`,
      category: "adult" as const,
      outdoorSensitivity: "standard" as const,
    }));
    expect(
      HouseholdProfileSchema.safeParse({ ...baseProfile, members: twentyOneMembers }).success
    ).toBe(false);

    // Rejects more than 60 activities
    const sixtyOneActivities = Array.from({ length: 61 }, (_, i) => ({
      id: `a${i}`,
      memberId: "m1",
      type: "school" as const,
      startTime: "08:00",
      endTime: "09:00",
      indoor: true,
    }));
    expect(
      HouseholdProfileSchema.safeParse({ ...baseProfile, activities: sixtyOneActivities }).success
    ).toBe(false);

    // Rejects more than 20 nonNegotiableActivityIds
    const twentyOneNonNegotiables = Array.from({ length: 21 }, (_, i) => `a${i}`);
    expect(
      HouseholdProfileSchema.safeParse({
        ...baseProfile,
        constraints: {
          ...baseProfile.constraints,
          nonNegotiableActivityIds: twentyOneNonNegotiables,
        },
      }).success
    ).toBe(false);

    // Rejects householdName longer than 100 characters
    expect(
      HouseholdProfileSchema.safeParse({
        ...baseProfile,
        householdName: "x".repeat(101),
      }).success
    ).toBe(false);

    // Accepts 20 members and 60 activities
    const twentyMembers = twentyOneMembers.slice(0, 20);
    const sixtyActivities = sixtyOneActivities.slice(0, 60);
    expect(
      HouseholdProfileSchema.safeParse({
        ...baseProfile,
        householdName: "x".repeat(100),
        members: twentyMembers,
        activities: sixtyActivities,
        constraints: {
          ...baseProfile.constraints,
          nonNegotiableActivityIds: twentyOneNonNegotiables.slice(0, 20),
        },
      }).success
    ).toBe(true);
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
