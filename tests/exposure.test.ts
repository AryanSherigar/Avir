import { describe, it, expect } from "vitest";
import { calculateHouseholdExposure } from "@/lib/exposure/calculate";
import {
  HouseholdProfile,
  HouseholdProfileSchema,
  EnvironmentalContextSchema,
} from "@/lib/schemas";
import demoAirQuality from "../data/demo-air-quality.json";

const delhiMultigenerationalProfile: HouseholdProfile = {
  location: {
    city: "Delhi",
    areaLabel: "Anand Vihar",
    latitude: 28.6469,
    longitude: 77.316,
  },
  members: [
    {
      id: "child-aarav",
      roleLabel: "Child (School Student)",
      category: "child",
      outdoorSensitivity: "higher",
    },
    {
      id: "parent-vikram",
      roleLabel: "Commuter Parent (Two-Wheeler)",
      category: "adult",
      outdoorSensitivity: "standard",
    },
    {
      id: "grandma-kalyani",
      roleLabel: "Grandmother (Senior)",
      category: "older_adult",
      outdoorSensitivity: "higher",
    },
  ],
  activities: [
    {
      id: "act-child-school",
      memberId: "child-aarav",
      type: "school",
      startTime: "08:00",
      endTime: "14:00",
      indoor: true,
    },
    {
      id: "act-child-play",
      memberId: "child-aarav",
      type: "exercise",
      startTime: "16:30",
      endTime: "17:30",
      indoor: false,
      transportMode: "none",
    },
    {
      id: "act-parent-commute-morning",
      memberId: "parent-vikram",
      type: "work",
      startTime: "08:00",
      endTime: "09:00",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 14,
    },
    {
      id: "act-parent-office",
      memberId: "parent-vikram",
      type: "work",
      startTime: "09:00",
      endTime: "17:00",
      indoor: true,
    },
    {
      id: "act-parent-commute-evening",
      memberId: "parent-vikram",
      type: "work",
      startTime: "18:00",
      endTime: "19:00",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 14,
    },
    {
      id: "act-grandma-errands",
      memberId: "grandma-kalyani",
      type: "errands",
      startTime: "07:00",
      endTime: "07:45",
      indoor: false,
      transportMode: "walk_cycle",
    },
    {
      id: "act-grandma-cooking",
      memberId: "grandma-kalyani",
      type: "cooking",
      startTime: "11:30",
      endTime: "13:00",
      indoor: true,
    },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: true,
    hasAirPurifier: false,
    usesIncenseOrCoils: true,
  },
  constraints: {
    dailyBudgetInr: 150,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: ["act-child-school", "act-parent-office"],
  },
};

describe("Exposure Engine Diagnostic Invariants", () => {
  const envContext = EnvironmentalContextSchema.parse(demoAirQuality);
  const hourlyForecast = envContext.hourlyForecast;

  it("validates realistic Delhi multigenerational profile schema", () => {
    const validated = HouseholdProfileSchema.safeParse(delhiMultigenerationalProfile);
    expect(validated.success).toBe(true);
  });

  it("Invariant 1: strictly conserves 24.0 hours across every member timeline", () => {
    const result = calculateHouseholdExposure(delhiMultigenerationalProfile, hourlyForecast);

    for (const member of delhiMultigenerationalProfile.members) {
      const memberExposure = result.memberExposures[member.id];
      expect(memberExposure).toBeDefined();
      if (!memberExposure) {
        throw new Error(`Member exposure missing for ${member.id}`);
      }

      const totalHours = memberExposure.totalTimeHours;
      const leakedHours = Math.abs(totalHours - 24.0);

      expect(
        leakedHours,
        `Timeline conservation failed for ${member.roleLabel} (${member.id}): expected 24.0h, received ${totalHours}h (leaked ${leakedHours.toFixed(6)}h)`
      ).toBeLessThan(1e-4);

      expect(memberExposure.hourlyBreakdown).toHaveLength(24);
    }
  });

  it("Invariant 2: applies 1.15 micro-environment penalty to two-wheeler commute", () => {
    const result = calculateHouseholdExposure(delhiMultigenerationalProfile, hourlyForecast);
    const parentExposure = result.memberExposures["parent-vikram"];
    expect(parentExposure).toBeDefined();
    if (!parentExposure) {
      throw new Error("Parent exposure missing");
    }

    const hour8Slot = parentExposure.hourlyBreakdown[8];
    expect(hour8Slot).toBeDefined();
    if (!hour8Slot) {
      throw new Error("Hour 8 breakdown slot missing");
    }

    const outdoorPm25Hour8 = hourlyForecast[8]?.pm25 ?? 0;
    const expectedExposureHour8 = outdoorPm25Hour8 * 1.15;

    expect(hour8Slot.centralEstimate).toBeCloseTo(expectedExposureHour8, 2);
    expect(hour8Slot.centralEstimate / outdoorPm25Hour8).toBeCloseTo(1.15, 4);

    const hour18Slot = parentExposure.hourlyBreakdown[18];
    expect(hour18Slot).toBeDefined();
    if (!hour18Slot) {
      throw new Error("Hour 18 breakdown slot missing");
    }

    const outdoorPm25Hour18 = hourlyForecast[18]?.pm25 ?? 0;
    const expectedExposureHour18 = outdoorPm25Hour18 * 1.15;

    expect(hour18Slot.centralEstimate).toBeCloseTo(expectedExposureHour18, 2);
    expect(hour18Slot.centralEstimate / outdoorPm25Hour18).toBeCloseTo(1.15, 4);
  });

  it("Invariant 3: prioritizes vulnerable members (child/senior) for peak vulnerability", () => {
    const result = calculateHouseholdExposure(delhiMultigenerationalProfile, hourlyForecast);
    const peakMemberId = result.peakVulnerableMember.memberId;

    expect(["child-aarav", "grandma-kalyani"]).toContain(peakMemberId);
    expect(peakMemberId).not.toBe("parent-vikram");

    const childExposure = result.memberExposures["child-aarav"];
    const grandmaExposure = result.memberExposures["grandma-kalyani"];
    expect(childExposure).toBeDefined();
    expect(grandmaExposure).toBeDefined();
    if (!childExposure || !grandmaExposure) {
      throw new Error("Vulnerable member exposures missing");
    }

    const maxVulnerableExposure = Math.max(
      childExposure.centralEstimate,
      grandmaExposure.centralEstimate
    );

    expect(result.peakVulnerableMember.exposure.centralEstimate).toBeCloseTo(
      maxVulnerableExposure,
      2
    );
  });

  it("Invariant 4: strictly bounds household mean exposure between low and high estimates", () => {
    const result = calculateHouseholdExposure(delhiMultigenerationalProfile, hourlyForecast);
    const { lowEstimate, centralEstimate, highEstimate } = result.householdMeanExposure;

    expect(lowEstimate).toBeLessThan(centralEstimate);
    expect(centralEstimate).toBeLessThan(highEstimate);

    const uncertaintySpread = highEstimate - lowEstimate;
    expect(uncertaintySpread).toBeGreaterThan(0);

    for (const member of Object.values(result.memberExposures)) {
      expect(member.lowEstimate).toBeLessThan(member.centralEstimate);
      expect(member.centralEstimate).toBeLessThan(member.highEstimate);
    }
  });
});
