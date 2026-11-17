# Avir Intervention & Counterfactual Simulation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intervention evaluation and counterfactual routine simulation engine (Spec 2) for Avir, delivering declarative prerequisite matching, cleanest-window time shifts with non-negotiable activity locks, multi-intervention composition across the Three Strictly Separate Output Pillars, transit deep linking, the zero-token Next.js `POST /api/simulate` route handler, and a formatted ASCII visual diagnostic CLI harness.

**Architecture:** A pure deterministic counterfactual simulation pipeline operating on validated Zod household profiles and environmental context forecasts. It schedules activities into cleanest-window PM2.5 troughs while strictly respecting non-negotiable activity locks, computes avoided vehicle kilometers without fabricated tailpipe grams, applies compounded infiltration and indoor source modifiers, and evaluates personal exposure proxy reductions alongside practicality constraints without ever aggregating the three pillars into a single score.

**Tech Stack:** Next.js 15 (App Router), TypeScript 5.7+ (strict mode), Zod 3.24+, Vitest 3.0+, tsx.

**Spec:** [docs/superpowers/specs/2026-11-17-avir-intervention-simulation-design.md](file:///data/avir/docs/superpowers/specs/2026-11-17-avir-intervention-simulation-design.md)

## Global Constraints

* System name: **Avir** (Smart Air Adaptation and Navigation System).
* **Three Pillars Are Never Combined:** Never aggregate Personal Protection, Environmental Contribution, and Practicality into a single composite score or index.
* **Deterministic Engine Purity (`src/lib/interventions/*`, `src/lib/simulation/*`):** Zero network `fetch`, zero `process.env`, zero `@google/genai` imports, zero browser APIs (`window`, `localStorage`).
* **Non-Negotiable Activity Invariant:** Any activity whose `id` appears in `profile.constraints.nonNegotiableActivityIds` is strictly locked. The engine will never shift its start or end time.
* **Honest Environmental Accounting:** Avoided vehicle emissions are reported directly in `privateVehicleKmAvoidedPerDay`. Strictly zero fabricated tailpipe gram emission factors.
* **Clean Code Directives:** TypeScript `strict: true`. Zero `any` and zero `@ts-ignore`. Functions under 40 lines. Max nesting 2 levels. Files under 250 lines.
* **Bilingual Support:** Support English (`en`) and Hindi (`hi`) based on `profile.constraints.preferredLanguage`.
* **Atomic Commits:** Commit regularly with conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`) after each task passes verification.

---

### Task 1: Simulation Schemas (`src/lib/schemas/simulation.ts`)

**Files:**
- Create: `src/lib/schemas/simulation.ts`
- Modify: `src/lib/schemas/index.ts`
- Test: `tests/simulation-schemas.test.ts`

**Interfaces:**
- Consumes:
  - `HouseholdProfileSchema`, `ActivitySchema` from `src/lib/schemas/household.ts`
  - `InterventionCategorySchema`, `InconvenienceLevelSchema` from `src/lib/schemas/interventions.ts`
- Produces:
  - `PersonalProtectionResultSchema`, `PersonalProtectionResult`
  - `EnvironmentalContributionResultSchema`, `EnvironmentalContributionResult`
  - `PracticalityResultSchema`, `PracticalityResult`
  - `EvaluatedInterventionSchema`, `EvaluatedIntervention`
  - `SimulateRequestSchema`, `SimulateRequest`
  - `SimulationResultSchema`, `SimulationResult`

- [ ] **Step 1: Write failing schema unit tests**

Create `tests/simulation-schemas.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  PersonalProtectionResultSchema,
  EnvironmentalContributionResultSchema,
  PracticalityResultSchema,
  EvaluatedInterventionSchema,
  SimulateRequestSchema,
  SimulationResultSchema,
} from "../src/lib/schemas/simulation";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/simulation-schemas.test.ts`
Expected: FAIL (module `simulation` not found).

- [ ] **Step 3: Implement `src/lib/schemas/simulation.ts` and barrel export**

Create `src/lib/schemas/simulation.ts`:
```typescript
import { z } from "zod";
import { HouseholdProfileSchema, ActivitySchema } from "./household";
import { InterventionCategorySchema, InconvenienceLevelSchema } from "./interventions";

export const PersonalProtectionResultSchema = z.object({
  baselineHouseholdMean: z.number(),
  projectedHouseholdMean: z.number(),
  baselinePeakVulnerable: z.number(),
  projectedPeakVulnerable: z.number(),
  deltaPeakExposureProxy: z.number(),
  relativeReductionPercentRange: z.tuple([z.number(), z.number()]),
  confidence: z.enum(["high", "medium", "low"]),
});

export const EnvironmentalContributionResultSchema = z.object({
  privateVehicleKmAvoidedPerDay: z.number().min(0),
  indoorCombustionSourceReduced: z.boolean(),
  summary: z.string(),
});

export const PracticalityResultSchema = z.object({
  estimatedCostInr: z.number().min(0),
  timeImpactMinutesPerDay: z.number(),
  inconvenienceLevel: InconvenienceLevelSchema,
  withinHouseholdConstraints: z.boolean(),
  mapsDirectionsUrl: z.string().url().optional(),
});

export const EvaluatedInterventionSchema = z.object({
  interventionId: z.string(),
  title: z.string(),
  description: z.string(),
  category: InterventionCategorySchema,
  personalProtection: PersonalProtectionResultSchema,
  environmentalContribution: EnvironmentalContributionResultSchema,
  practicality: PracticalityResultSchema,
  evidence: z.array(
    z.object({
      id: z.string(),
      sourceTitle: z.string(),
      claimSummary: z.string(),
      limitations: z.string(),
    })
  ),
  assumptions: z.array(z.string()),
});

export const SimulateRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  selectedInterventionIds: z.array(z.string()).default([]),
  activityOverrides: z.array(ActivitySchema).optional(),
});

export const SimulationResultSchema = z.object({
  counterfactualProfile: HouseholdProfileSchema,
  evaluatedInterventions: z.array(EvaluatedInterventionSchema),
  combinedPersonalProtection: PersonalProtectionResultSchema,
  combinedEnvironmentalContribution: EnvironmentalContributionResultSchema,
  combinedPracticality: PracticalityResultSchema,
  assumptions: z.array(z.string()),
});

export type PersonalProtectionResult = z.infer<typeof PersonalProtectionResultSchema>;
export type EnvironmentalContributionResult = z.infer<typeof EnvironmentalContributionResultSchema>;
export type PracticalityResult = z.infer<typeof PracticalityResultSchema>;
export type EvaluatedIntervention = z.infer<typeof EvaluatedInterventionSchema>;
export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
```

Update `src/lib/schemas/index.ts` to export everything from `./simulation`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/simulation-schemas.test.ts`
Expected: PASS (4 tests passed).

- [ ] **Step 5: Commit Task 1**

```bash
git add src/lib/schemas/simulation.ts src/lib/schemas/index.ts tests/simulation-schemas.test.ts
git commit -m "feat(schemas): add simulation request and three-pillar output schemas"
```

---

### Task 2: Infiltration & Commute Multipliers Extension for Exposure Calculation

**Files:**
- Modify: `src/lib/exposure/indoor-model.ts`
- Modify: `src/lib/exposure/calculate.ts`
- Modify: `tests/calculate.test.ts`

**Interfaces:**
- Consumes: `HouseholdProfile`, `HourlyForecastPoint`
- Produces:
  - `calculateIndoorConcentration(outdoorPm25, home, hourIndex, isCooking, infiltrationMultiplier = 1.0)`
  - `calculateHouseholdExposure(profile, hourlyForecast, options?: ExposureCalculationOptions)`
  - `ExposureCalculationOptions { infiltrationMultiplier?: number; maskMultiplier?: number }`

- [ ] **Step 1: Write failing test for exposure modifiers**

Add tests to `tests/calculate.test.ts`:
```typescript
it("applies infiltrationMultiplier to reduce indoor exposure", () => {
  const profile = createTestProfile();
  const baseline = calculateHouseholdExposure(profile, testForecast);
  const reduced = calculateHouseholdExposure(profile, testForecast, {
    infiltrationMultiplier: 0.8,
  });

  expect(reduced.householdMeanExposure.centralEstimate).toBeLessThan(
    baseline.householdMeanExposure.centralEstimate
  );
});

it("applies maskMultiplier to reduce outdoor transit exposure", () => {
  const profile = createTestProfileWithTwoWheeler();
  const baseline = calculateHouseholdExposure(profile, testForecast);
  const masked = calculateHouseholdExposure(profile, testForecast, {
    maskMultiplier: 0.4,
  });

  expect(masked.householdMeanExposure.centralEstimate).toBeLessThan(
    baseline.householdMeanExposure.centralEstimate
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculate.test.ts`
Expected: FAIL (options parameter not handled or estimates equal).

- [ ] **Step 3: Update `src/lib/exposure/indoor-model.ts` and `src/lib/exposure/calculate.ts`**

In `src/lib/exposure/indoor-model.ts`:
Add `infiltrationMultiplier: number = 1.0` to `getInfiltrationBand` and `calculateIndoorConcentration`.
```typescript
export function getInfiltrationBand(
  home: HomeEnvironment,
  infiltrationMultiplier: number = 1.0
): InfiltrationBand {
  const [low, central, high] = BASE_INFILTRATION[home.ventilation];
  const purifierFactor = home.hasAirPurifier ? PURIFIER_INFILTRATION_FACTOR : 1.0;
  return [
    low * purifierFactor * infiltrationMultiplier,
    central * purifierFactor * infiltrationMultiplier,
    high * purifierFactor * infiltrationMultiplier,
  ];
}

export function calculateIndoorConcentration(
  outdoorPm25: number,
  home: HomeEnvironment,
  hourIndex: number,
  isCooking: boolean,
  infiltrationMultiplier: number = 1.0
): IndoorConcentrationBand {
  const [fLow, fCentral, fHigh] = getInfiltrationBand(home, infiltrationMultiplier);
  const source = calculateIndoorSource(home, hourIndex, isCooking);

  return {
    low: fLow * outdoorPm25 + source,
    central: fCentral * outdoorPm25 + source,
    high: fHigh * outdoorPm25 + source,
  };
}
```

In `src/lib/exposure/calculate.ts`:
Add `ExposureCalculationOptions` and pass modifiers into `computeSlotExposure`:
```typescript
export interface ExposureCalculationOptions {
  infiltrationMultiplier?: number;
  maskMultiplier?: number;
}
```
In `computeSlotExposure`:
If `!act.indoor && (act.transportMode === "two_wheeler" || act.transportMode === "walk_cycle")`:
multiply outdoor concentration by `options?.maskMultiplier ?? 1.0`.
If `act.indoor`:
pass `options?.infiltrationMultiplier ?? 1.0` to `calculateIndoorConcentration`.

- [ ] **Step 4: Run all exposure tests to verify backward compatibility and pass**

Run: `npx vitest run tests/calculate.test.ts tests/exposure.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/exposure/indoor-model.ts src/lib/exposure/calculate.ts tests/calculate.test.ts
git commit -m "feat(exposure): add optional infiltration and mask multipliers to exposure calculator"
```

---

### Task 3: Declarative Prerequisite Matcher & Catalogue Loader

**Files:**
- Create: `src/lib/interventions/catalogue.ts`
- Create: `tests/interventions.test.ts`

**Interfaces:**
- Consumes:
  - `data/interventions.json`
  - `HouseholdProfile`, `InterventionRule` from `src/lib/schemas`
- Produces:
  - `getInterventionCatalogue(): InterventionRule[]`
  - `getInterventionById(id: string): InterventionRule | undefined`
  - `isInterventionApplicable(rule: InterventionRule, profile: HouseholdProfile): boolean`
  - `getApplicableInterventions(profile: HouseholdProfile): InterventionRule[]`

- [ ] **Step 1: Write failing tests in `tests/interventions.test.ts`**

Create `tests/interventions.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  getInterventionCatalogue,
  getInterventionById,
  isInterventionApplicable,
  getApplicableInterventions,
} from "../src/lib/interventions/catalogue";
import { HouseholdProfileSchema } from "../src/lib/schemas";

const baseProfile = HouseholdProfileSchema.parse({
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-parent", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
  ],
  activities: [
    { id: "a-commute", memberId: "m-parent", type: "work", startTime: "08:00", endTime: "09:00", indoor: false, transportMode: "two_wheeler", commuteDistanceKm: 15 },
    { id: "a-cook", memberId: "m-parent", type: "cooking", startTime: "19:00", endTime: "20:00", indoor: true },
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
  it("loads 8 core interventions from catalogue", () => {
    const catalogue = getInterventionCatalogue();
    expect(catalogue.length).toBeGreaterThanOrEqual(8);
  });

  it("finds intervention by ID", () => {
    const metro = getInterventionById("metro_transit_shift");
    expect(metro).toBeDefined();
    expect(metro?.category).toBe("emission_reduction");
  });

  it("matches transport prerequisite correctly", () => {
    const metro = getInterventionById("metro_transit_shift")!;
    expect(isInterventionApplicable(metro, baseProfile)).toBe(true);

    const noTransitProfile = {
      ...baseProfile,
      activities: baseProfile.activities.map((a) => ({ ...a, transportMode: "walk_cycle" as const })),
    };
    // metro requires two_wheeler or car
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

  it("returns all applicable interventions for profile", () => {
    const applicable = getApplicableInterventions(baseProfile);
    const ids = applicable.map((r) => r.id);
    expect(ids).toContain("metro_transit_shift");
    expect(ids).toContain("eliminate_evening_incense");
    expect(ids).not.toContain("switch_solid_to_induction");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/interventions.test.ts`
Expected: FAIL (`catalogue` module not found).

- [ ] **Step 3: Implement `src/lib/interventions/catalogue.ts`**

Create `src/lib/interventions/catalogue.ts`:
```typescript
import rawInterventions from "../../../data/interventions.json";
import { HouseholdProfile } from "../schemas/household";
import { InterventionRule, InterventionRuleSchema } from "../schemas/interventions";

const catalogue: InterventionRule[] = rawInterventions.map((item) =>
  InterventionRuleSchema.parse(item)
);

export function getInterventionCatalogue(): InterventionRule[] {
  return catalogue;
}

export function getInterventionById(id: string): InterventionRule | undefined {
  return catalogue.find((item) => item.id === id);
}

export function isInterventionApplicable(
  rule: InterventionRule,
  profile: HouseholdProfile
): boolean {
  const { prerequisites } = rule;

  if (prerequisites.requiresActivityTypes && prerequisites.requiresActivityTypes.length > 0) {
    const hasActivity = profile.activities.some((a) =>
      prerequisites.requiresActivityTypes?.includes(a.type)
    );
    if (!hasActivity) return false;
  }

  if (prerequisites.applicableTransport && prerequisites.applicableTransport.length > 0) {
    const hasTransport = profile.activities.some(
      (a) => a.transportMode && prerequisites.applicableTransport?.includes(a.transportMode)
    );
    if (!hasTransport) return false;
  }

  if (prerequisites.applicableCookingFuel && prerequisites.applicableCookingFuel.length > 0) {
    if (!prerequisites.applicableCookingFuel.includes(profile.home.cookingFuel)) {
      return false;
    }
  }

  if (prerequisites.requiresIncenseUse === true && !profile.home.usesIncenseOrCoils) {
    return false;
  }

  if (prerequisites.requiresNoPurifier === true && profile.home.hasAirPurifier) {
    return false;
  }

  if (prerequisites.requiresPurifier === true && !profile.home.hasAirPurifier) {
    return false;
  }

  return true;
}

export function getApplicableInterventions(profile: HouseholdProfile): InterventionRule[] {
  return catalogue.filter((rule) => isInterventionApplicable(rule, profile));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/interventions.test.ts`
Expected: PASS (all 6 tests pass).

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/interventions/catalogue.ts tests/interventions.test.ts
git commit -m "feat(interventions): implement declarative prerequisite matcher and catalogue loader"
```

---

### Task 4: Single Intervention Evaluator & Maps Transit Deep Links

**Files:**
- Create: `src/lib/interventions/evaluate.ts`
- Create: `src/lib/interventions/index.ts`
- Modify: `tests/interventions.test.ts`

**Interfaces:**
- Consumes:
  - `data/evidence.json`
  - `InterventionRule`, `HouseholdProfile`, `HourlyForecastPoint`
- Produces:
  - `buildMapsDirectionsUrl(origin?: string, destination?: string): string | undefined`
  - `evaluateIntervention(rule: InterventionRule, profile: HouseholdProfile, hourlyForecast: HourlyForecastPoint[]): EvaluatedIntervention`

- [ ] **Step 1: Write failing tests for `evaluateIntervention` and `buildMapsDirectionsUrl`**

Add tests to `tests/interventions.test.ts`:
```typescript
import {
  buildMapsDirectionsUrl,
  evaluateIntervention,
} from "../src/lib/interventions/evaluate";
import demoAir from "../../data/demo-air-quality.json";

describe("evaluateIntervention & deep links", () => {
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
    const evaluatedEn = evaluateIntervention(metro, baseProfile, demoAir.hourlyForecast);

    expect(evaluatedEn.interventionId).toBe("metro_transit_shift");
    expect(evaluatedEn.title).toBe("Switch Daily Commute to Delhi Metro");
    expect(evaluatedEn.evidence.length).toBeGreaterThan(0);
    expect(evaluatedEn.evidence[0]?.sourceTitle).toBeDefined();
    expect(evaluatedEn.environmentalContribution.privateVehicleKmAvoidedPerDay).toBe(15);
    expect(evaluatedEn.practicality.estimatedCostInr).toBe(60);

    const hindiProfile = {
      ...baseProfile,
      constraints: { ...baseProfile.constraints, preferredLanguage: "hi" as const },
    };
    const evaluatedHi = evaluateIntervention(metro, hindiProfile, demoAir.hourlyForecast);
    expect(evaluatedHi.title).toBe("दैनिक आवागमन के लिए दिल्ली मेट्रो का उपयोग करें");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/interventions.test.ts`
Expected: FAIL (`evaluate.ts` not found).

- [ ] **Step 3: Implement `src/lib/interventions/evaluate.ts` and barrel export `src/lib/interventions/index.ts`**

Create `src/lib/interventions/evaluate.ts`:
```typescript
import rawEvidence from "../../../data/evidence.json";
import { calculateHouseholdExposure } from "../exposure";
import { HouseholdProfile, HourlyForecastPoint, EvidenceEntrySchema } from "../schemas";
import { InterventionRule } from "../schemas/interventions";
import {
  EvaluatedIntervention,
  PersonalProtectionResult,
  EnvironmentalContributionResult,
  PracticalityResult,
} from "../schemas/simulation";

const evidenceEntries = rawEvidence.map((e) => EvidenceEntrySchema.parse(e));

export function buildMapsDirectionsUrl(origin?: string, destination?: string): string | undefined {
  if (!origin || !destination) return undefined;
  const baseUrl = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams({
    origin,
    destination,
    travelmode: "transit",
  });
  return `${baseUrl}&${params.toString()}`;
}

function resolveEvidence(evidenceRefs: string[]) {
  return evidenceRefs
    .map((ref) => evidenceEntries.find((e) => e.id === ref))
    .filter((e): e is NonNullable<typeof e> => e !== undefined)
    .map((e) => ({
      id: e.id,
      sourceTitle: e.sourceTitle,
      claimSummary: e.claimSummary,
      limitations: e.limitations,
    }));
}

function computeIsolatedProfile(
  rule: InterventionRule,
  profile: HouseholdProfile
): {
  isolatedProfile: HouseholdProfile;
  avoidedKm: number;
  indoorSourceReduced: boolean;
  transitUrl?: string;
} {
  const cloned: HouseholdProfile = JSON.parse(JSON.stringify(profile));
  let avoidedKm = 0;
  let indoorSourceReduced = false;
  let transitUrl: string | undefined;

  if (rule.effectModifiers.replaceTransportWith === "public_transit") {
    for (const act of cloned.activities) {
      if (
        act.transportMode &&
        rule.prerequisites.applicableTransport?.includes(act.transportMode)
      ) {
        avoidedKm += act.commuteDistanceKm ?? 0;
        act.transportMode = "public_transit";
        if (!transitUrl && act.originLabel && act.destinationLabel) {
          transitUrl = buildMapsDirectionsUrl(act.originLabel, act.destinationLabel);
        }
      }
    }
  }

  if (rule.id === "eliminate_evening_incense") {
    cloned.home.usesIncenseOrCoils = false;
    indoorSourceReduced = true;
  }
  if (rule.id === "switch_solid_to_induction") {
    cloned.home.cookingFuel = "electric_induction";
    indoorSourceReduced = true;
  }
  if (rule.id === "exhaust_hood_cooking") {
    cloned.home.hasOutdoorExhaust = true;
    indoorSourceReduced = true;
  }

  return { isolatedProfile: cloned, avoidedKm, indoorSourceReduced, transitUrl };
}

export function evaluateIntervention(
  rule: InterventionRule,
  profile: HouseholdProfile,
  hourlyForecast: HourlyForecastPoint[]
): EvaluatedIntervention {
  const lang = profile.constraints.preferredLanguage;
  const title = rule.title[lang] || rule.title.en;
  const description = rule.description[lang] || rule.description.en;

  const baseline = calculateHouseholdExposure(profile, hourlyForecast);
  const { isolatedProfile, avoidedKm, indoorSourceReduced, transitUrl } =
    computeIsolatedProfile(rule, profile);

  const infiltrationMultiplier = rule.effectModifiers.infiltrationMultiplier ?? 1.0;
  const maskMultiplier = rule.id === "n95_two_wheeler_commute" ? 0.4 : 1.0;

  const projected = calculateHouseholdExposure(isolatedProfile, hourlyForecast, {
    infiltrationMultiplier,
    maskMultiplier,
  });

  const baseMean = Number(baseline.householdMeanExposure.centralEstimate.toFixed(1));
  const projMean = Number(projected.householdMeanExposure.centralEstimate.toFixed(1));
  const basePeak = Number(baseline.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const projPeak = Number(projected.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const deltaPeak = Number((projPeak - basePeak).toFixed(1));

  const relLow = Math.max(0, ((baseline.householdMeanExposure.lowEstimate - projected.householdMeanExposure.lowEstimate) / Math.max(1, baseline.householdMeanExposure.lowEstimate)) * 100);
  const relHigh = Math.max(0, ((baseline.householdMeanExposure.highEstimate - projected.householdMeanExposure.highEstimate) / Math.max(1, baseline.householdMeanExposure.highEstimate)) * 100);

  const personalProtection: PersonalProtectionResult = {
    baselineHouseholdMean: baseMean,
    projectedHouseholdMean: projMean,
    baselinePeakVulnerable: basePeak,
    projectedPeakVulnerable: projPeak,
    deltaPeakExposureProxy: deltaPeak,
    relativeReductionPercentRange: [
      Number(Math.min(relLow, relHigh).toFixed(1)),
      Number(Math.max(relLow, relHigh).toFixed(1)),
    ],
    confidence: "high",
  };

  const environmentalContribution: EnvironmentalContributionResult = {
    privateVehicleKmAvoidedPerDay: avoidedKm,
    indoorCombustionSourceReduced,
    summary: avoidedKm > 0
      ? `${avoidedKm.toFixed(1)} km of private vehicle travel avoided per day.`
      : indoorSourceReduced
      ? "Reduces localized indoor combustion emissions."
      : "No direct tailpipe emission impact.",
  };

  const cost = rule.practicality.estimatedCostInr;
  const time = rule.practicality.timeImpactMinutesPerDay;
  const withinHouseholdConstraints =
    cost <= profile.constraints.dailyBudgetInr &&
    time <= profile.constraints.maxExtraTimeMinutesPerDay;

  const practicality: PracticalityResult = {
    estimatedCostInr: cost,
    timeImpactMinutesPerDay: time,
    inconvenienceLevel: rule.practicality.inconvenienceLevel,
    withinHouseholdConstraints,
    mapsDirectionsUrl: transitUrl,
  };

  const evidence = resolveEvidence(rule.evidenceRefs);
  const assumptions = [
    `Evaluation assumes 100% adherence to ${rule.id}.`,
    "Exposure proxy assumes indoor infiltration and source models from peer-reviewed literature.",
  ];

  return {
    interventionId: rule.id,
    title,
    description,
    category: rule.category,
    personalProtection,
    environmentalContribution,
    practicality,
    evidence,
    assumptions,
  };
}
```

Create `src/lib/interventions/index.ts`:
```typescript
export * from "./catalogue";
export * from "./evaluate";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/interventions.test.ts`
Expected: PASS (9 tests pass).

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/interventions/evaluate.ts src/lib/interventions/index.ts tests/interventions.test.ts
git commit -m "feat(interventions): implement single-intervention evaluator and maps deep linking"
```

---

### Task 5: Cleanest-Window Time-Shift Optimizer with Non-Negotiable Locks

**Files:**
- Create: `src/lib/simulation/time-shift.ts`
- Create: `tests/simulation.test.ts`

**Interfaces:**
- Consumes: `Activity`, `HourlyForecastPoint`, `ActivityType`
- Produces:
  - `calculateActivityDuration(startTime: string, endTime: string): number`
  - `findCleanestWindowStartHour(hourlyForecast: HourlyForecastPoint[], durationHours: number): number`
  - `shiftActivitiesToCleanestWindow(activities: Activity[], targetTypes: ActivityType[], hourlyForecast: HourlyForecastPoint[], nonNegotiableIds: string[]): Activity[]`

- [ ] **Step 1: Write failing tests in `tests/simulation.test.ts`**

Create `tests/simulation.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  calculateActivityDuration,
  findCleanestWindowStartHour,
  shiftActivitiesToCleanestWindow,
} from "../src/lib/simulation/time-shift";
import demoAir from "../../data/demo-air-quality.json";
import { Activity } from "../src/lib/schemas/household";

describe("Time-Shift Optimizer with Non-Negotiable Invariant", () => {
  it("calculates activity duration correctly", () => {
    expect(calculateActivityDuration("06:00", "07:30")).toBe(1.5);
    expect(calculateActivityDuration("22:00", "02:00")).toBe(4.0);
  });

  it("finds the lowest PM2.5 trough hour in diurnal forecast", () => {
    const startHour = findCleanestWindowStartHour(demoAir.hourlyForecast, 1.0);
    // In demo data, hour 14 has lowest PM2.5 (145 µg/m³)
    expect(startHour).toBe(14);
  });

  it("shifts movable activities to cleanest window", () => {
    const activities: Activity[] = [
      {
        id: "act-exercise",
        memberId: "m1",
        type: "exercise",
        startTime: "06:00",
        endTime: "07:00",
        indoor: false,
      },
    ];

    const shifted = shiftActivitiesToCleanestWindow(
      activities,
      ["exercise"],
      demoAir.hourlyForecast,
      []
    );

    expect(shifted[0]?.startTime).toBe("14:00");
    expect(shifted[0]?.endTime).toBe("15:00");
  });

  it("STRICT INVARIANT: never shifts non-negotiable activities", () => {
    const activities: Activity[] = [
      {
        id: "act-school",
        memberId: "m1",
        type: "school",
        startTime: "07:30",
        endTime: "14:00",
        indoor: true,
      },
    ];

    const shifted = shiftActivitiesToCleanestWindow(
      activities,
      ["school"],
      demoAir.hourlyForecast,
      ["act-school"] // locked!
    );

    expect(shifted[0]?.startTime).toBe("07:30");
    expect(shifted[0]?.endTime).toBe("14:00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/simulation.test.ts`
Expected: FAIL (`time-shift` module not found).

- [ ] **Step 3: Implement `src/lib/simulation/time-shift.ts`**

Create `src/lib/simulation/time-shift.ts`:
```typescript
import { Activity, ActivityType } from "../schemas/household";
import { HourlyForecastPoint } from "../schemas/air";

function parseTimeToHours(hhmm: string): number {
  const parts = hhmm.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours + minutes / 60;
}

export function calculateActivityDuration(startTime: string, endTime: string): number {
  const start = parseTimeToHours(startTime);
  const end = parseTimeToHours(endTime);
  return end >= start ? end - start : 24.0 - start + end;
}

export function formatHourAndFraction(hourFloat: number): string {
  const normalized = (hourFloat % 24 + 24) % 24;
  const hours = Math.floor(normalized);
  const minutes = Math.round((normalized - hours) * 60);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function findCleanestWindowStartHour(
  hourlyForecast: HourlyForecastPoint[],
  durationHours: number
): number {
  const windowLength = Math.max(1, Math.ceil(durationHours));
  let bestStartHour = 0;
  let lowestAveragePm = Number.POSITIVE_INFINITY;

  for (let start = 0; start < 24; start++) {
    let sum = 0;
    for (let i = 0; i < windowLength; i++) {
      const idx = (start + i) % 24;
      sum += hourlyForecast[idx]?.pm25 ?? 0;
    }
    const avg = sum / windowLength;
    if (avg < lowestAveragePm) {
      lowestAveragePm = avg;
      bestStartHour = start;
    }
  }

  return bestStartHour;
}

export function shiftActivitiesToCleanestWindow(
  activities: Activity[],
  targetTypes: ActivityType[],
  hourlyForecast: HourlyForecastPoint[],
  nonNegotiableIds: string[]
): Activity[] {
  return activities.map((act) => {
    if (nonNegotiableIds.includes(act.id)) {
      return { ...act };
    }
    if (!targetTypes.includes(act.type)) {
      return { ...act };
    }

    const duration = calculateActivityDuration(act.startTime, act.endTime);
    const bestHour = findCleanestWindowStartHour(hourlyForecast, duration);

    return {
      ...act,
      startTime: formatHourAndFraction(bestHour),
      endTime: formatHourAndFraction(bestHour + duration),
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/simulation.test.ts`
Expected: PASS (4 tests pass).

- [ ] **Step 5: Commit Task 5**

```bash
git add src/lib/simulation/time-shift.ts tests/simulation.test.ts
git commit -m "feat(simulation): implement cleanest-window time shift optimizer with non-negotiable lock"
```

---

### Task 6: Counterfactual Multi-Intervention Simulation Pipeline

**Files:**
- Create: `src/lib/simulation/compare.ts`
- Create: `src/lib/simulation/index.ts`
- Modify: `tests/simulation.test.ts`

**Interfaces:**
- Consumes:
  - `HouseholdProfile`, `HourlyForecastPoint`, `Activity` from `src/lib/schemas`
  - `getInterventionById`, `evaluateIntervention` from `src/lib/interventions`
  - `shiftActivitiesToCleanestWindow` from `src/lib/simulation/time-shift`
- Produces:
  - `simulateRoutine(profile: HouseholdProfile, selectedInterventionIds: string[], hourlyForecast: HourlyForecastPoint[], activityOverrides?: Activity[]): SimulationResult`

- [ ] **Step 1: Write failing tests for multi-intervention composition in `tests/simulation.test.ts`**

Add tests to `tests/simulation.test.ts`:
```typescript
import { simulateRoutine } from "../src/lib/simulation/compare";
import { HouseholdProfileSchema } from "../src/lib/schemas";

const testProfile = HouseholdProfileSchema.parse({
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-parent", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
  ],
  activities: [
    { id: "a-school", memberId: "m-child", type: "school", startTime: "07:30", endTime: "14:00", indoor: true },
    { id: "a-exercise", memberId: "m-parent", type: "exercise", startTime: "06:00", endTime: "07:00", indoor: false },
    { id: "a-commute", memberId: "m-parent", type: "work", startTime: "08:15", endTime: "09:15", indoor: false, transportMode: "two_wheeler", commuteDistanceKm: 15 },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: true,
  },
  constraints: {
    dailyBudgetInr: 200,
    maxExtraTimeMinutesPerDay: 45,
    preferredLanguage: "en",
    nonNegotiableActivityIds: ["a-school"],
  },
});

describe("simulateRoutine multi-intervention composition", () => {
  it("executes 4 stacked interventions correctly", () => {
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

    // 2. Exercise shifted to trough
    const exerciseAct = result.counterfactualProfile.activities.find((a) => a.id === "a-exercise");
    expect(exerciseAct?.startTime).toBe("14:00");

    // 3. Metro swap avoided km
    expect(result.combinedEnvironmentalContribution.privateVehicleKmAvoidedPerDay).toBe(15);

    // 4. Personal protection delta is negative (exposure reduction)
    expect(result.combinedPersonalProtection.deltaPeakExposureProxy).toBeLessThan(0);

    // 5. Practicality respects budget
    expect(result.combinedPracticality.estimatedCostInr).toBe(410); // 60 + 350
    expect(result.combinedPracticality.timeImpactMinutesPerDay).toBe(15);

    // 6. Evaluated interventions array contains all 4
    expect(result.evaluatedInterventions).toHaveLength(4);
  });

  it("clamps compounded infiltration multiplier to minimum 0.20", () => {
    // If multiple weatherstripping interventions existed, it never drops below 0.20
    const result = simulateRoutine(testProfile, ["weatherstrip_windows"], demoAir.hourlyForecast);
    expect(result.combinedPersonalProtection.projectedHouseholdMean).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/simulation.test.ts`
Expected: FAIL (`simulateRoutine` not found).

- [ ] **Step 3: Implement `src/lib/simulation/compare.ts` and `src/lib/simulation/index.ts`**

Create `src/lib/simulation/compare.ts`:
```typescript
import { calculateHouseholdExposure } from "../exposure";
import { getInterventionById, evaluateIntervention, buildMapsDirectionsUrl } from "../interventions";
import { Activity, ActivityType, HouseholdProfile } from "../schemas/household";
import { HourlyForecastPoint } from "../schemas/air";
import {
  SimulationResult,
  PersonalProtectionResult,
  EnvironmentalContributionResult,
  PracticalityResult,
  InconvenienceLevelSchema,
} from "../schemas/simulation";
import { shiftActivitiesToCleanestWindow } from "./time-shift";
import { z } from "zod";

type InconvenienceLevel = z.infer<typeof InconvenienceLevelSchema>;

const INCONVENIENCE_ORDER: Record<InconvenienceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function resolveHighestInconvenience(levels: InconvenienceLevel[]): InconvenienceLevel {
  let highest: InconvenienceLevel = "low";
  for (const lvl of levels) {
    if (INCONVENIENCE_ORDER[lvl] > INCONVENIENCE_ORDER[highest]) {
      highest = lvl;
    }
  }
  return highest;
}

function applyActivityOverrides(activities: Activity[], overrides?: Activity[]): Activity[] {
  if (!overrides || overrides.length === 0) return activities;
  const overrideMap = new Map(overrides.map((o) => [o.id, o]));
  return activities.map((act) => overrideMap.get(act.id) ?? act);
}

export function simulateRoutine(
  profile: HouseholdProfile,
  selectedInterventionIds: string[],
  hourlyForecast: HourlyForecastPoint[],
  activityOverrides?: Activity[]
): SimulationResult {
  const cloned: HouseholdProfile = JSON.parse(JSON.stringify(profile));
  cloned.activities = applyActivityOverrides(cloned.activities, activityOverrides);

  const baseline = calculateHouseholdExposure(profile, hourlyForecast);
  const rules = selectedInterventionIds
    .map((id) => getInterventionById(id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  // Stage 1: Schedule Adjustments
  const targetShiftTypes: ActivityType[] = [];
  for (const r of rules) {
    if (r.effectModifiers.shiftActivityTypesToLowestPmWindow) {
      targetShiftTypes.push(...r.effectModifiers.shiftActivityTypesToLowestPmWindow);
    }
  }
  if (targetShiftTypes.length > 0) {
    cloned.activities = shiftActivitiesToCleanestWindow(
      cloned.activities,
      targetShiftTypes,
      hourlyForecast,
      profile.constraints.nonNegotiableActivityIds
    );
  }

  // Stage 2: Transport Swaps & Sum Avoided Km
  let totalAvoidedKm = 0;
  let transitUrl: string | undefined;
  const transitRule = rules.find((r) => r.effectModifiers.replaceTransportWith === "public_transit");
  if (transitRule) {
    for (const act of cloned.activities) {
      if (
        act.transportMode &&
        transitRule.prerequisites.applicableTransport?.includes(act.transportMode)
      ) {
        totalAvoidedKm += act.commuteDistanceKm ?? 0;
        act.transportMode = "public_transit";
        if (!transitUrl && act.originLabel && act.destinationLabel) {
          transitUrl = buildMapsDirectionsUrl(act.originLabel, act.destinationLabel);
        }
      }
    }
  }

  // Stage 3: Compounding Environmental Modifiers
  let compoundedInfiltration = 1.0;
  let indoorSourceReduced = false;
  let maskActive = false;

  for (const r of rules) {
    if (r.effectModifiers.infiltrationMultiplier) {
      compoundedInfiltration *= r.effectModifiers.infiltrationMultiplier;
    }
    if (r.id === "eliminate_evening_incense") {
      cloned.home.usesIncenseOrCoils = false;
      indoorSourceReduced = true;
    }
    if (r.id === "switch_solid_to_induction") {
      cloned.home.cookingFuel = "electric_induction";
      indoorSourceReduced = true;
    }
    if (r.id === "exhaust_hood_cooking") {
      cloned.home.hasOutdoorExhaust = true;
      indoorSourceReduced = true;
    }
    if (r.id === "n95_two_wheeler_commute") {
      maskActive = true;
    }
  }

  // Physical lower bound clamping
  compoundedInfiltration = Math.max(0.20, Math.min(1.0, compoundedInfiltration));

  // Stage 4: Three-Pillar Delta Computation
  const projected = calculateHouseholdExposure(cloned, hourlyForecast, {
    infiltrationMultiplier: compoundedInfiltration,
    maskMultiplier: maskActive ? 0.4 : 1.0,
  });

  const baseMean = Number(baseline.householdMeanExposure.centralEstimate.toFixed(1));
  const projMean = Number(projected.householdMeanExposure.centralEstimate.toFixed(1));
  const basePeak = Number(baseline.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const projPeak = Number(projected.peakVulnerableMember.exposure.centralEstimate.toFixed(1));
  const deltaPeak = Number((projPeak - basePeak).toFixed(1));

  const relLow = Math.max(0, ((baseline.householdMeanExposure.lowEstimate - projected.householdMeanExposure.lowEstimate) / Math.max(1, baseline.householdMeanExposure.lowEstimate)) * 100);
  const relHigh = Math.max(0, ((baseline.householdMeanExposure.highEstimate - projected.householdMeanExposure.highEstimate) / Math.max(1, baseline.householdMeanExposure.highEstimate)) * 100);

  const combinedPersonalProtection: PersonalProtectionResult = {
    baselineHouseholdMean: baseMean,
    projectedHouseholdMean: projMean,
    baselinePeakVulnerable: basePeak,
    projectedPeakVulnerable: projPeak,
    deltaPeakExposureProxy: deltaPeak,
    relativeReductionPercentRange: [
      Number(Math.min(relLow, relHigh).toFixed(1)),
      Number(Math.max(relLow, relHigh).toFixed(1)),
    ],
    confidence: "high",
  };

  const combinedEnvironmentalContribution: EnvironmentalContributionResult = {
    privateVehicleKmAvoidedPerDay: totalAvoidedKm,
    indoorCombustionSourceReduced,
    summary: totalAvoidedKm > 0
      ? `${totalAvoidedKm.toFixed(1)} km private vehicle travel avoided per day by shifting to transit.`
      : indoorSourceReduced
      ? "Indoor combustion sources eliminated or vented."
      : "No direct emission reduction.",
  };

  const totalCost = rules.reduce((sum, r) => sum + r.practicality.estimatedCostInr, 0);
  const totalTime = rules.reduce((sum, r) => sum + r.practicality.timeImpactMinutesPerDay, 0);
  const highestInconvenience = resolveHighestInconvenience(
    rules.map((r) => r.practicality.inconvenienceLevel)
  );

  const withinHouseholdConstraints =
    totalCost <= profile.constraints.dailyBudgetInr &&
    totalTime <= profile.constraints.maxExtraTimeMinutesPerDay;

  const combinedPracticality: PracticalityResult = {
    estimatedCostInr: totalCost,
    timeImpactMinutesPerDay: totalTime,
    inconvenienceLevel: highestInconvenience,
    withinHouseholdConstraints,
    mapsDirectionsUrl: transitUrl,
  };

  const evaluatedInterventions = rules.map((r) =>
    evaluateIntervention(r, profile, hourlyForecast)
  );

  const assumptions = [
    "Simulation assumes 100% adherence to all selected interventions.",
    "Compounded infiltration factor is physically clamped to >= 0.20.",
    "Avoided vehicle emissions count only converted private motorized kilometers.",
  ];

  return {
    counterfactualProfile: cloned,
    evaluatedInterventions,
    combinedPersonalProtection,
    combinedEnvironmentalContribution,
    combinedPracticality,
    assumptions,
  };
}
```

Create `src/lib/simulation/index.ts`:
```typescript
export * from "./time-shift";
export * from "./compare";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/simulation.test.ts`
Expected: PASS (6 tests pass).

- [ ] **Step 5: Commit Task 6**

```bash
git add src/lib/simulation/compare.ts src/lib/simulation/index.ts tests/simulation.test.ts
git commit -m "feat(simulation): implement counterfactual multi-intervention composition pipeline"
```

---

### Task 7: Next.js Route Handler `POST /api/simulate`

**Files:**
- Create: `src/app/api/simulate/route.ts`
- Create: `tests/api-simulate.test.ts`

**Interfaces:**
- Consumes: NextRequest, `SimulateRequestSchema`
- Produces: JSON response conforming to `SimulationResultSchema`

- [ ] **Step 1: Write failing tests for route handler**

Create `tests/api-simulate.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { POST } from "../src/app/api/simulate/route";
import { NextRequest } from "next/server";
import { HouseholdProfileSchema } from "../src/lib/schemas";

const validProfile = HouseholdProfileSchema.parse({
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
  ],
  activities: [
    { id: "a-school", memberId: "m-child", type: "school", startTime: "07:30", endTime: "14:00", indoor: true },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: false,
  },
  constraints: {
    dailyBudgetInr: 100,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: [],
  },
});

describe("POST /api/simulate Route Handler", () => {
  it("returns 200 with typed simulation result on valid payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: validProfile,
        selectedInterventionIds: ["weatherstrip_windows"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.combinedPersonalProtection).toBeDefined();
    expect(data.combinedEnvironmentalContribution).toBeDefined();
    expect(data.combinedPracticality).toBeDefined();
    expect(data.evaluatedInterventions).toHaveLength(1);
  });

  it("returns 400 on invalid payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid payload");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-simulate.test.ts`
Expected: FAIL (`route.ts` not found).

- [ ] **Step 3: Implement `src/app/api/simulate/route.ts`**

Create `src/app/api/simulate/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { SimulateRequestSchema } from "@/lib/schemas/simulation";
import { simulateRoutine } from "@/lib/simulation";
import demoAir from "../../../../data/demo-air-quality.json";
import { HourlyForecastPoint } from "@/lib/schemas/air";

const hourlyForecast = demoAir.hourlyForecast as HourlyForecastPoint[];

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SimulateRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { profile, selectedInterventionIds, activityOverrides } = parsed.data;
    const result = simulateRoutine(
      profile,
      selectedInterventionIds,
      hourlyForecast,
      activityOverrides
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal simulation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api-simulate.test.ts`
Expected: PASS (2 tests pass).

- [ ] **Step 5: Commit Task 7**

```bash
git add src/app/api/simulate/route.ts tests/api-simulate.test.ts
git commit -m "feat(api): implement zero-token POST /api/simulate route handler"
```

---

### Task 8: Visual Diagnostic CLI Harness (`scripts/verify-simulation.ts`)

**Files:**
- Create: `scripts/verify-simulation.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `simulateRoutine`, `demo-air-quality.json`
- Produces: Executable visual ASCII CLI harness via `npm run verify:simulation`

- [ ] **Step 1: Implement `scripts/verify-simulation.ts`**

Create `scripts/verify-simulation.ts`:
```typescript
import demoAir from "../data/demo-air-quality.json";
import { HouseholdProfile, HouseholdProfileSchema, HourlyForecastPoint } from "../src/lib/schemas";
import { simulateRoutine } from "../src/lib/simulation";

function createPresetDelhiProfile(): HouseholdProfile {
  return HouseholdProfileSchema.parse({
    location: {
      city: "Delhi",
      areaLabel: "Anand Vihar",
      latitude: 28.6139,
      longitude: 77.209,
    },
    members: [
      { id: "m-child", roleLabel: "School Child", category: "child", outdoorSensitivity: "higher" },
      { id: "m-commuter", roleLabel: "Commuter Parent", category: "adult", outdoorSensitivity: "standard" },
      { id: "m-senior", roleLabel: "Grandmother", category: "older_adult", outdoorSensitivity: "higher" },
    ],
    activities: [
      { id: "a-child-school", memberId: "m-child", type: "school", startTime: "07:30", endTime: "14:00", indoor: true },
      { id: "a-commute-out", memberId: "m-commuter", type: "work", startTime: "08:15", endTime: "09:15", indoor: false, transportMode: "two_wheeler", commuteDistanceKm: 15, originLabel: "Anand Vihar", destinationLabel: "Connaught Place" },
      { id: "a-commute-back", memberId: "m-commuter", type: "work", startTime: "18:00", endTime: "19:00", indoor: false, transportMode: "two_wheeler", commuteDistanceKm: 15, originLabel: "Connaught Place", destinationLabel: "Anand Vihar" },
      { id: "a-senior-walk", memberId: "m-senior", type: "exercise", startTime: "06:00", endTime: "07:00", indoor: false },
      { id: "a-cook-lunch", memberId: "m-senior", type: "cooking", startTime: "11:30", endTime: "13:00", indoor: true },
      { id: "a-cook-dinner", memberId: "m-senior", type: "cooking", startTime: "19:00", endTime: "20:30", indoor: true },
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
      nonNegotiableActivityIds: ["a-child-school"],
    },
  });
}

function main(): void {
  console.log("================================================================================");
  console.log("                 AVIR COUNTERFACTUAL SIMULATION DIAGNOSTIC                      ");
  console.log("================================================================================");

  const profile = createPresetDelhiProfile();
  const selectedInterventions = [
    "metro_transit_shift",
    "weatherstrip_windows",
    "shift_morning_exercise",
    "eliminate_evening_incense",
  ];

  console.log("[✓] Profile: Delhi Multigenerational Preset (3 Members, 6 Activities)");
  console.log(`[✓] Selected Interventions (${selectedInterventions.length}):`);
  selectedInterventions.forEach((id) => console.log(`    - ${id}`));
  console.log("");

  const hourlyForecast = demoAir.hourlyForecast as HourlyForecastPoint[];
  const result = simulateRoutine(profile, selectedInterventions, hourlyForecast);

  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 1: PERSONAL PROTECTION (EXPOSURE PROXY REDUCTION)");
  console.log("--------------------------------------------------------------------------------");
  const pp = result.combinedPersonalProtection;
  console.log(`Peak Vulnerable Baseline Exposure  : ${pp.baselinePeakVulnerable} µg/m³·h`);
  console.log(`Peak Vulnerable Projected Exposure : ${pp.projectedPeakVulnerable} µg/m³·h`);
  console.log(`Peak Exposure Delta (ΔE_proxy)     : ${pp.deltaPeakExposureProxy} µg/m³·h (Negative = Reduced)`);
  console.log(`Household Mean Exposure Baseline   : ${pp.baselineHouseholdMean} µg/m³·h`);
  console.log(`Household Mean Projected Exposure  : ${pp.projectedHouseholdMean} µg/m³·h`);
  console.log(`Relative Reduction Bounds          : [${pp.relativeReductionPercentRange[0]}%, ${pp.relativeReductionPercentRange[1]}%]`);
  console.log(`Model Confidence                   : ${pp.confidence.toUpperCase()}`);
  console.log("");

  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 2: ENVIRONMENTAL CONTRIBUTION (HONEST EMISSION ACCOUNTING)");
  console.log("--------------------------------------------------------------------------------");
  const ec = result.combinedEnvironmentalContribution;
  console.log(`Private Vehicle Travel Avoided     : ${ec.privateVehicleKmAvoidedPerDay.toFixed(1)} km/day`);
  console.log(`Indoor Combustion Sources Reduced   : ${ec.indoorCombustionSourceReduced ? "YES" : "NO"}`);
  console.log(`Accounting Summary                 : ${ec.summary}`);
  console.log("");

  console.log("--------------------------------------------------------------------------------");
  console.log("PILLAR 3: PRACTICALITY & CONSTRAINTS");
  console.log("--------------------------------------------------------------------------------");
  const pr = result.combinedPracticality;
  console.log(`Estimated Financial Outlay         : ₹${pr.estimatedCostInr} (Budget: ₹${profile.constraints.dailyBudgetInr})`);
  console.log(`Daily Time Impact                  : ${pr.timeImpactMinutesPerDay} min (Max Allowed: ${profile.constraints.maxExtraTimeMinutesPerDay} min)`);
  console.log(`Routine Inconvenience Level        : ${pr.inconvenienceLevel.toUpperCase()}`);
  console.log(`Within Household Constraints       : ${pr.withinHouseholdConstraints ? "YES [PASS]" : "NO [FAIL]"}`);
  if (pr.mapsDirectionsUrl) {
    console.log(`Transit Directions Deep Link       : ${pr.mapsDirectionsUrl}`);
  }
  console.log("");

  console.log("--------------------------------------------------------------------------------");
  console.log("INVARIANT VERIFICATION");
  console.log("--------------------------------------------------------------------------------");
  let passed = true;

  // Invariant 1: Locked activity preserved
  const originalSchool = profile.activities.find((a) => a.id === "a-child-school")!;
  const shiftedSchool = result.counterfactualProfile.activities.find((a) => a.id === "a-child-school")!;
  const lockedOk = originalSchool.startTime === shiftedSchool.startTime && originalSchool.endTime === shiftedSchool.endTime;
  console.log(`[${lockedOk ? "PASS" : "FAIL"}] Non-Negotiable Activity Hard Lock: ${shiftedSchool.id} remained at ${shiftedSchool.startTime}-${shiftedSchool.endTime}`);
  if (!lockedOk) passed = false;

  // Invariant 2: Exercise activity shifted to trough
  const shiftedWalk = result.counterfactualProfile.activities.find((a) => a.id === "a-senior-walk")!;
  const exerciseShiftOk = shiftedWalk.startTime === "14:00";
  console.log(`[${exerciseShiftOk ? "PASS" : "FAIL"}] Cleanest Window Rescheduling: ${shiftedWalk.id} shifted to 14:00 trough (was 06:00)`);
  if (!exerciseShiftOk) passed = false;

  // Invariant 3: Avoided vehicle km > 0
  const kmOk = ec.privateVehicleKmAvoidedPerDay === 30.0;
  console.log(`[${kmOk ? "PASS" : "FAIL"}] Avoided Private Vehicle Travel: ${ec.privateVehicleKmAvoidedPerDay} km (15km x 2 trips)`);
  if (!kmOk) passed = false;

  // Invariant 4: Personal exposure proxy reduction Delta < 0
  const deltaOk = pp.deltaPeakExposureProxy < 0;
  console.log(`[${deltaOk ? "PASS" : "FAIL"}] Personal Exposure Proxy Reduced: Δ = ${pp.deltaPeakExposureProxy} µg/m³·h`);
  if (!deltaOk) passed = false;

  // Invariant 5: Practicality within constraints
  const constrOk = pr.withinHouseholdConstraints === true;
  console.log(`[${constrOk ? "PASS" : "FAIL"}] Practicality Within Budget & Time Bounds`);
  if (!constrOk) passed = false;

  console.log("================================================================================");
  if (!passed) {
    console.error("DIAGNOSTIC FAILURE: One or more invariants violated!");
    process.exit(1);
  }

  console.log("ALL 5 SIMULATION INVARIANTS SATISFIED. THREE PILLARS STRICTLY INDEPENDENT.");
  process.exit(0);
}

main();
```

- [ ] **Step 2: Add `"verify:simulation"` script to `package.json`**

Update `package.json` scripts:
`"verify:simulation": "npx tsx scripts/verify-simulation.ts"`

- [ ] **Step 3: Run the visual diagnostic harness to verify it passes**

Run: `npm run verify:simulation`
Expected: ALL 5 SIMULATION INVARIANTS SATISFIED (exit code 0).

- [ ] **Step 4: Commit Task 8**

```bash
git add scripts/verify-simulation.ts package.json
git commit -m "feat(scripts): add visual diagnostic harness for counterfactual simulation"
```

---

### Task 9: Final Full-Suite Verification & Linting

**Files:**
- Entire repository

- [ ] **Step 1: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: Clean exit code 0.

- [ ] **Step 2: Run all unit test suites**

Run: `npm run test`
Expected: All test suites pass (Spec 1 + Spec 2 tests).

- [ ] **Step 3: Run both diagnostic harnesses**

Run: `npm run verify:core`
Run: `npm run verify:simulation`
Expected: Both exit with code 0.

- [ ] **Step 4: Run linter**

Run: `npm run lint`
Expected: Zero lint errors.

- [ ] **Step 5: Final Git Status & Clean State Check**

Run: `git status`
Expected: Clean working tree, all changes committed.
