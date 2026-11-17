import { describe, it, expect } from "vitest";
import {
  getInterventionCatalogue,
  getInterventionById,
  isInterventionApplicable,
  getApplicableInterventions,
} from "../src/lib/interventions/catalogue";
import {
  evaluateIntervention,
  buildMapsDirectionsUrl,
} from "../src/lib/interventions/evaluate";
import { HouseholdProfileSchema } from "../src/lib/schemas";
import demoAir from "../data/demo-air-quality.json";


const baseProfile = HouseholdProfileSchema.parse({
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-parent", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
  ],
  activities: [
    {
      id: "a-commute",
      memberId: "m-parent",
      type: "work",
      startTime: "08:00",
      endTime: "09:00",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
    },
    {
      id: "a-cook",
      memberId: "m-parent",
      type: "cooking",
      startTime: "19:00",
      endTime: "20:00",
      indoor: true,
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
    dailyBudgetInr: 100,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: [],
  },
});

describe("Intervention Catalogue & Prerequisite Matcher", () => {
  it("loads core interventions from catalogue", () => {
    const catalogue = getInterventionCatalogue();
    expect(catalogue.length).toBeGreaterThanOrEqual(8);
  });

  it("finds intervention by ID", () => {
    const metro = getInterventionById("metro_transit_shift");
    expect(metro).toBeDefined();
    expect(metro?.category).toBe("emission_reduction");
  });

  it("returns undefined for unknown ID", () => {
    expect(getInterventionById("non_existent")).toBeUndefined();
  });

  it("matches transport prerequisite correctly", () => {
    const metro = getInterventionById("metro_transit_shift")!;
    expect(isInterventionApplicable(metro, baseProfile)).toBe(true);

    const noTransitProfile = {
      ...baseProfile,
      activities: baseProfile.activities.map((a) => ({
        ...a,
        transportMode: "walk_cycle" as const,
      })),
    };
    expect(isInterventionApplicable(metro, noTransitProfile)).toBe(false);
  });

  it("matches incense prerequisite correctly", () => {
    const incenseRule = getInterventionById("eliminate_evening_incense")!;
    expect(isInterventionApplicable(incenseRule, baseProfile)).toBe(true);

    const noIncenseProfile = {
      ...baseProfile,
      home: { ...baseProfile.home, usesIncenseOrCoils: false },
    };
    expect(isInterventionApplicable(incenseRule, noIncenseProfile)).toBe(false);
  });

  it("matches cooking fuel prerequisite correctly", () => {
    const solidFuelRule = getInterventionById("switch_solid_to_induction")!;
    expect(isInterventionApplicable(solidFuelRule, baseProfile)).toBe(false);

    const solidProfile = {
      ...baseProfile,
      home: { ...baseProfile.home, cookingFuel: "solid_fuel" as const },
    };
    expect(isInterventionApplicable(solidFuelRule, solidProfile)).toBe(true);
  });

  it("matches purifier and noPurifier prerequisites correctly", () => {
    const dummyRuleNoPurifier = {
      ...getInterventionById("weatherstrip_windows")!,
      prerequisites: { requiresNoPurifier: true },
    };
    expect(isInterventionApplicable(dummyRuleNoPurifier, baseProfile)).toBe(true);

    const purifierProfile = {
      ...baseProfile,
      home: { ...baseProfile.home, hasAirPurifier: true },
    };
    expect(isInterventionApplicable(dummyRuleNoPurifier, purifierProfile)).toBe(false);

    const dummyRulePurifier = {
      ...getInterventionById("weatherstrip_windows")!,
      prerequisites: { requiresPurifier: true },
    };
    expect(isInterventionApplicable(dummyRulePurifier, baseProfile)).toBe(false);
    expect(isInterventionApplicable(dummyRulePurifier, purifierProfile)).toBe(true);
  });

  it("returns all applicable interventions for profile", () => {
    const applicable = getApplicableInterventions(baseProfile);
    const ids = applicable.map((r) => r.id);
    expect(ids).toContain("metro_transit_shift");
    expect(ids).toContain("eliminate_evening_incense");
    expect(ids).not.toContain("switch_solid_to_induction");
  });
});

describe("evaluateIntervention & Maps transit deep links", () => {
  it("builds correct Google Maps Transit direction URL", () => {
    const url = buildMapsDirectionsUrl("Anand Vihar", "Connaught Place");
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=Anand+Vihar&destination=Connaught+Place&travelmode=transit"
    );
  });

  it("returns undefined if origin or destination is missing", () => {
    expect(buildMapsDirectionsUrl("Anand Vihar", undefined)).toBeUndefined();
    expect(buildMapsDirectionsUrl(undefined, "Connaught Place")).toBeUndefined();
  });

  it("evaluates single intervention with evidence and localized strings", () => {
    const metro = getInterventionById("metro_transit_shift")!;
    const profileWithTransitLabels = {
      ...baseProfile,
      activities: baseProfile.activities.map((a) =>
        a.id === "a-commute"
          ? { ...a, originLabel: "Anand Vihar", destinationLabel: "Connaught Place" }
          : a
      ),
    };
    const evaluatedEn = evaluateIntervention(metro, profileWithTransitLabels, demoAir.hourlyForecast);

    expect(evaluatedEn.interventionId).toBe("metro_transit_shift");
    expect(evaluatedEn.title).toBe("Switch Daily Commute to Delhi Metro");
    expect(evaluatedEn.evidence.length).toBeGreaterThan(0);
    expect(evaluatedEn.evidence[0]?.sourceTitle).toBeDefined();
    expect(evaluatedEn.environmentalContribution.privateVehicleKmAvoidedPerDay).toBe(15);
    expect(evaluatedEn.practicality.estimatedCostInr).toBe(60);
    expect(evaluatedEn.practicality.mapsDirectionsUrl).toBeDefined();

    const hindiProfile = {
      ...profileWithTransitLabels,
      constraints: { ...baseProfile.constraints, preferredLanguage: "hi" as const },
    };
    const evaluatedHi = evaluateIntervention(metro, hindiProfile, demoAir.hourlyForecast);
    expect(evaluatedHi.title).toBe("दैनिक आवागमन के लिए दिल्ली मेट्रो का उपयोग करें");
  });
});

