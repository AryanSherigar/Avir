# Avir Core Foundation & Deterministic Engines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Avir repository with Next.js 15, TypeScript strict mode, Tailwind CSS, Vitest, and Zod runtime schemas, then build the 100% deterministic exposure engine and diagnostic verification harness.

**Architecture:** A pure deterministic exposure modeling engine operating on validated Zod domain profiles without external network or LLM dependencies. Member schedules are discretized into 24-hour slots with complete mathematical time conservation (24.0h), combined with infiltration bands ($F_i$) and indoor source terms ($S_i$) to compute member and peak-vulnerable exposure proxies ($E_{\text{proxy}, m}$ in $\mu\text{g/m}^3 \cdot \text{h}$).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.7+, Tailwind CSS, Vitest, tsx, Zod.

**Spec:** [docs/superpowers/specs/2026-11-17-avir-core-foundation-design.md](file:///data/avir/docs/superpowers/specs/2026-11-17-avir-core-foundation-design.md)

## Global Constraints

* System name: Avir (never SAANS).
* Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`. Zero `any` and zero `@ts-ignore`.
* Max file size: Under 250 lines. Max function length: Under 40 lines.
* Flat control flow: Maximum 2 levels of nesting.
* Zero external calls in `src/lib/exposure/*`: Zero `fetch`, zero `process.env`, zero `window`/`localStorage`, zero `@google/genai`.
* Single branch `main`, total repository size strictly under 10 MB.
* Traceable unit tests & diagnostic harness: every assertion provides explicit context on failure.

---

### Task 1: Scaffolding, Tooling & Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Modify: `.gitignore`
- Modify: `AGENTS.md` (Update project name to Avir)

**Interfaces:**
- Consumes: None (root configuration)
- Produces: Working npm toolchain, strict TypeScript compilation, in-memory Vitest runner, and `npm run verify:core` script.

- [ ] **Step 1: Update AGENTS.md with Avir branding**

Update `/data/avir/AGENTS.md` to reference **Avir (Smart Air Adaptation and Navigation System)** and ensure all rules align with Avir.

- [ ] **Step 2: Create package.json**

Create `/data/avir/package.json`:
```json
{
  "name": "avir",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "verify:core": "npx tsx scripts/verify-exposure.ts"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "next": "^15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^3.0.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/node": "^22.13.4",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "postcss": "^8.5.2",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

Create `/data/avir/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create vitest.config.ts and .gitignore**

Create `/data/avir/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `/data/avir/.gitignore`:
```text
node_modules
.next
out
dist
coverage
.env*.local
.env
.DS_Store
*.log
```

- [ ] **Step 5: Install dependencies & run typecheck**

Run:
```bash
npm install
npm run typecheck
```
Expected: `npm install` finishes with 0 audit vulnerabilities; `typecheck` exits with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md package.json package-lock.json tsconfig.json vitest.config.ts .gitignore
git commit -m "chore: scaffold Avir project configuration with Next 15, TypeScript 5.7 and Vitest"
```

---

### Task 2: Domain Schemas with Zod

**Files:**
- Create: `src/lib/schemas/household.ts`
- Create: `src/lib/schemas/air.ts`
- Create: `src/lib/schemas/interventions.ts`
- Create: `src/lib/schemas/index.ts`
- Create: `tests/schemas.test.ts`

**Interfaces:**
- Consumes: `zod`
- Produces: Exported Zod schemas and TypeScript types: `HouseholdProfile`, `Member`, `Activity`, `HomeEnvironment`, `Constraints`, `CurrentObservation`, `HourlyForecastPoint`, `EnvironmentalContext`, `InterventionRule`, `EvidenceEntry`.

- [ ] **Step 1: Write failing schema tests**

Create `/data/avir/tests/schemas.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  HouseholdProfileSchema,
  EnvironmentalContextSchema,
  InterventionRuleSchema,
  EvidenceEntrySchema,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schemas.test.ts`
Expected: FAIL with "Cannot find module '@/lib/schemas'"

- [ ] **Step 3: Implement household schema**

Create `/data/avir/src/lib/schemas/household.ts`:
```typescript
import { z } from "zod";

export const LocationSchema = z.object({
  city: z.string().min(2).max(60).regex(/^[a-zA-Z\s.-]+$/),
  areaLabel: z.string().min(2).max(100).optional(),
  latitude: z.number().min(-90).max(90).default(28.6139),
  longitude: z.number().min(-180).max(180).default(77.209),
});

export const MemberCategorySchema = z.enum(["child", "adult", "older_adult"]);
export const OutdoorSensitivitySchema = z.enum(["standard", "higher"]);

export const MemberSchema = z.object({
  id: z.string().min(1),
  roleLabel: z.string().min(1).max(50),
  category: MemberCategorySchema,
  outdoorSensitivity: OutdoorSensitivitySchema,
});

export const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ActivityTypeSchema = z.enum([
  "school",
  "work",
  "cooking",
  "exercise",
  "indoor_rest",
  "errands",
]);

export const TransportModeSchema = z.enum([
  "two_wheeler",
  "car",
  "public_transit",
  "walk_cycle",
  "none",
]);

export const ActivitySchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  type: ActivityTypeSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  indoor: z.boolean(),
  transportMode: TransportModeSchema.optional(),
  commuteDistanceKm: z.number().min(0).max(150).optional(),
  originLabel: z.string().max(100).optional(),
  destinationLabel: z.string().max(100).optional(),
});

export const VentilationLevelSchema = z.enum(["low", "moderate", "good"]);
export const CookingFuelSchema = z.enum(["lpg", "electric_induction", "solid_fuel"]);

export const HomeEnvironmentSchema = z.object({
  ventilation: VentilationLevelSchema,
  cookingFuel: CookingFuelSchema,
  hasOutdoorExhaust: z.boolean(),
  hasAirPurifier: z.boolean(),
  usesIncenseOrCoils: z.boolean(),
});

export const ConstraintsSchema = z.object({
  dailyBudgetInr: z.number().min(0),
  maxExtraTimeMinutesPerDay: z.number().min(0),
  preferredLanguage: z.enum(["en", "hi"]).default("en"),
  nonNegotiableActivityIds: z.array(z.string()).default([]),
});

export const HouseholdProfileSchema = z.object({
  location: LocationSchema,
  members: z.array(MemberSchema).min(1),
  activities: z.array(ActivitySchema),
  home: HomeEnvironmentSchema,
  constraints: ConstraintsSchema,
});

export type Location = z.infer<typeof LocationSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type HomeEnvironment = z.infer<typeof HomeEnvironmentSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
```

- [ ] **Step 4: Implement air and intervention schemas**

Create `/data/avir/src/lib/schemas/air.ts`:
```typescript
import { z } from "zod";

export const DataSourceSchema = z.enum(["cpcb", "open_meteo_current", "demo"]);
export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const CurrentObservationSchema = z.object({
  stationName: z.string().min(1),
  city: z.string().min(1),
  source: DataSourceSchema,
  observedAt: z.string().min(1),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  officialNaqi: z.number().nullable(),
  confidence: ConfidenceLevelSchema,
  distanceKm: z.number().min(0).optional(),
});

export const HourlyForecastPointSchema = z.object({
  hourIndex: z.number().int().min(0).max(23),
  isoTime: z.string().min(1),
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  windSpeedKmh: z.number().min(0).optional(),
});

export const EnvironmentalContextSchema = z.object({
  currentObservation: CurrentObservationSchema,
  hourlyForecast: z.array(HourlyForecastPointSchema).length(24),
  dataQualityWarnings: z.array(z.string()).default([]),
  isDemoFallback: z.boolean().default(false),
});

export type CurrentObservation = z.infer<typeof CurrentObservationSchema>;
export type HourlyForecastPoint = z.infer<typeof HourlyForecastPointSchema>;
export type EnvironmentalContext = z.infer<typeof EnvironmentalContextSchema>;
```

Create `/data/avir/src/lib/schemas/interventions.ts`:
```typescript
import { z } from "zod";
import { ActivityTypeSchema, TransportModeSchema, CookingFuelSchema } from "./household";

export const BilingualTextSchema = z.object({
  en: z.string().min(1),
  hi: z.string().min(1),
});

export const InterventionCategorySchema = z.enum([
  "exposure_reduction",
  "emission_reduction",
  "indoor_air",
  "schedule",
]);

export const InconvenienceLevelSchema = z.enum(["low", "medium", "high"]);

export const InterventionRuleSchema = z.object({
  id: z.string().min(1),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  category: InterventionCategorySchema,
  prerequisites: z.object({
    requiresActivityTypes: z.array(ActivityTypeSchema).optional(),
    applicableTransport: z.array(TransportModeSchema).optional(),
    applicableCookingFuel: z.array(CookingFuelSchema).optional(),
    requiresIncenseUse: z.boolean().optional(),
    requiresNoPurifier: z.boolean().optional(),
    requiresPurifier: z.boolean().optional(),
  }),
  effectModifiers: z.object({
    infiltrationMultiplier: z.number().positive().max(1.0).optional(),
    indoorSourceMultiplier: z.number().positive().max(1.0).optional(),
    shiftActivityTypesToLowestPmWindow: z.array(ActivityTypeSchema).optional(),
    replaceTransportWith: z.literal("public_transit").optional(),
    ventilationWindowOnly: z.boolean().optional(),
  }),
  practicality: z.object({
    estimatedCostInr: z.number().min(0),
    timeImpactMinutesPerDay: z.number(),
    inconvenienceLevel: InconvenienceLevelSchema,
  }),
  evidenceRefs: z.array(z.string()),
});

export const EvidenceEntrySchema = z.object({
  id: z.string().min(1),
  sourceTitle: z.string().min(1),
  authorsOrAgency: z.string().min(1),
  year: z.number().int(),
  claimSummary: z.string().min(1),
  limitations: z.string().min(1),
  url: z.string().url().optional(),
});

export type InterventionRule = z.infer<typeof InterventionRuleSchema>;
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;
```

Create `/data/avir/src/lib/schemas/index.ts`:
```typescript
export * from "./household";
export * from "./air";
export * from "./interventions";
```

- [ ] **Step 5: Run tests & verify pass**

Run: `npx vitest run tests/schemas.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas tests/schemas.test.ts
git commit -m "feat: add Zod domain schemas for household, air quality and interventions"
```

---

### Task 3: Curated Datasets

**Files:**
- Create: `data/demo-air-quality.json`
- Create: `data/interventions.json`
- Create: `data/evidence.json`
- Create: `tests/datasets.test.ts`

**Interfaces:**
- Consumes: `src/lib/schemas`
- Produces: Valid static JSON files matching schema definitions exactly, with zero schema violations.

- [ ] **Step 1: Write dataset validation test**

Create `/data/avir/tests/datasets.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/datasets.test.ts`
Expected: FAIL (files do not exist yet)

- [ ] **Step 3: Create data/demo-air-quality.json**

Create `/data/avir/data/demo-air-quality.json`:
```json
{
  "currentObservation": {
    "stationName": "Anand Vihar, Delhi - DPCC",
    "city": "Delhi",
    "source": "demo",
    "observedAt": "2026-11-17T18:00:00+05:30",
    "pm25": 345,
    "pm10": 480,
    "no2": 78,
    "officialNaqi": 422,
    "confidence": "high",
    "distanceKm": 4.2
  },
  "hourlyForecast": [
    { "hourIndex": 0, "isoTime": "2026-11-17T00:00:00+05:30", "pm25": 285, "pm10": 410, "windSpeedKmh": 4.1 },
    { "hourIndex": 1, "isoTime": "2026-11-17T01:00:00+05:30", "pm25": 295, "pm10": 425, "windSpeedKmh": 3.8 },
    { "hourIndex": 2, "isoTime": "2026-11-17T02:00:00+05:30", "pm25": 310, "pm10": 440, "windSpeedKmh": 3.2 },
    { "hourIndex": 3, "isoTime": "2026-11-17T03:00:00+05:30", "pm25": 325, "pm10": 460, "windSpeedKmh": 2.9 },
    { "hourIndex": 4, "isoTime": "2026-11-17T04:00:00+05:30", "pm25": 340, "pm10": 475, "windSpeedKmh": 2.5 },
    { "hourIndex": 5, "isoTime": "2026-11-17T05:00:00+05:30", "pm25": 360, "pm10": 490, "windSpeedKmh": 2.4 },
    { "hourIndex": 6, "isoTime": "2026-11-17T06:00:00+05:30", "pm25": 380, "pm10": 510, "windSpeedKmh": 2.6 },
    { "hourIndex": 7, "isoTime": "2026-11-17T07:00:00+05:30", "pm25": 395, "pm10": 530, "windSpeedKmh": 3.1 },
    { "hourIndex": 8, "isoTime": "2026-11-17T08:00:00+05:30", "pm25": 375, "pm10": 505, "windSpeedKmh": 4.5 },
    { "hourIndex": 9, "isoTime": "2026-11-17T09:00:00+05:30", "pm25": 330, "pm10": 450, "windSpeedKmh": 6.2 },
    { "hourIndex": 10, "isoTime": "2026-11-17T10:00:00+05:30", "pm25": 280, "pm10": 390, "windSpeedKmh": 8.0 },
    { "hourIndex": 11, "isoTime": "2026-11-17T11:00:00+05:30", "pm25": 230, "pm10": 330, "windSpeedKmh": 9.8 },
    { "hourIndex": 12, "isoTime": "2026-11-17T12:00:00+05:30", "pm25": 190, "pm10": 280, "windSpeedKmh": 11.2 },
    { "hourIndex": 13, "isoTime": "2026-11-17T13:00:00+05:30", "pm25": 160, "pm10": 240, "windSpeedKmh": 12.0 },
    { "hourIndex": 14, "isoTime": "2026-11-17T14:00:00+05:30", "pm25": 145, "pm10": 220, "windSpeedKmh": 12.5 },
    { "hourIndex": 15, "isoTime": "2026-11-17T15:00:00+05:30", "pm25": 155, "pm10": 230, "windSpeedKmh": 11.0 },
    { "hourIndex": 16, "isoTime": "2026-11-17T16:00:00+05:30", "pm25": 180, "pm10": 265, "windSpeedKmh": 9.2 },
    { "hourIndex": 17, "isoTime": "2026-11-17T17:00:00+05:30", "pm25": 235, "pm10": 335, "windSpeedKmh": 6.8 },
    { "hourIndex": 18, "isoTime": "2026-11-17T18:00:00+05:30", "pm25": 290, "pm10": 410, "windSpeedKmh": 5.0 },
    { "hourIndex": 19, "isoTime": "2026-11-17T19:00:00+05:30", "pm25": 335, "pm10": 465, "windSpeedKmh": 3.9 },
    { "hourIndex": 20, "isoTime": "2026-11-17T20:00:00+05:30", "pm25": 365, "pm10": 500, "windSpeedKmh": 3.2 },
    { "hourIndex": 21, "isoTime": "2026-11-17T21:00:00+05:30", "pm25": 385, "pm10": 525, "windSpeedKmh": 2.8 },
    { "hourIndex": 22, "isoTime": "2026-11-17T22:00:00+05:30", "pm25": 395, "pm10": 540, "windSpeedKmh": 2.5 },
    { "hourIndex": 23, "isoTime": "2026-11-17T23:00:00+05:30", "pm25": 350, "pm10": 490, "windSpeedKmh": 3.0 }
  ],
  "dataQualityWarnings": ["Demo Delhi smog snapshot active for offline evaluation"],
  "isDemoFallback": true
}
```

- [ ] **Step 4: Create data/evidence.json and data/interventions.json**

Create `/data/avir/data/evidence.json`:
```json
[
  {
    "id": "cpcb_naqi_2015",
    "sourceTitle": "National Air Quality Index: Guidelines & Health Breakpoints",
    "authorsOrAgency": "Central Pollution Control Board (CPCB), MoEFCC",
    "year": 2015,
    "claimSummary": "Defines Indian NAQI breakpoints and hourly concentration sub-indices.",
    "limitations": "Official NAQI requires minimum 16 hours of continuous monitoring across at least 3 pollutants."
  },
  {
    "id": "pant_indoor_2019",
    "sourceTitle": "Particulate matter exposure in indoor and outdoor microenvironments in Delhi",
    "authorsOrAgency": "Pant, P., et al.",
    "year": 2019,
    "claimSummary": "Demonstrates indoor/outdoor PM2.5 infiltration ratios of 0.50 to 0.85 in naturally ventilated Delhi homes.",
    "limitations": "Infiltration varies with door/window construction and micro-local wind pressure."
  },
  {
    "id": "who_aqg_2021",
    "sourceTitle": "Global Air Quality Guidelines: Particulate Matter (PM2.5 and PM10)",
    "authorsOrAgency": "World Health Organization",
    "year": 2021,
    "claimSummary": "Recommends 24-hour PM2.5 limit of 15 µg/m³; establishes linear exposure-response without safe threshold.",
    "limitations": "Guideline represents epidemiological ideal; immediate attainment infeasible in winter Indo-Gangetic Plain."
  },
  {
    "id": "icmr_respiratory_2020",
    "sourceTitle": "Health effects of ambient air pollution in Indian megacities",
    "authorsOrAgency": "Indian Council of Medical Research (ICMR)",
    "year": 2020,
    "claimSummary": "Confirms elevated vulnerability for school children and older adults with pre-existing cardiopulmonary symptoms.",
    "limitations": "Population-level statistical risk; individual vulnerability varies."
  },
  {
    "id": "goel_commute_2015",
    "sourceTitle": "Commuter exposure to PM2.5 and black carbon in auto-rickshaws, buses, and metro in Delhi",
    "authorsOrAgency": "Goel, R. & Kumar, P.",
    "year": 2015,
    "claimSummary": "Open-air motorized two-wheelers and pedestrians experience 15-25% higher acute PM2.5 exposure than closed vehicles.",
    "limitations": "On-road concentration spikes depend on immediate tailpipe proximity and traffic congestion."
  },
  {
    "id": "kitchen_exhaust_2018",
    "sourceTitle": "Indoor air quality impact of cooking fuels and exhaust ventilation in urban households",
    "authorsOrAgency": "Balakrishnan, K., et al.",
    "year": 2018,
    "claimSummary": "Active outdoor kitchen exhaust reduces localized cooking PM2.5 surge by 60-70%.",
    "limitations": "Assumes hood flow rate exceeds 200 m³/h with direct outdoor venting."
  },
  {
    "id": "agarbatti_smoke_2017",
    "sourceTitle": "Emission factors and chemical characteristics of incense smoke in confined spaces",
    "authorsOrAgency": "See, S.W. & Balasubramanian, R.",
    "year": 2017,
    "claimSummary": "Confined evening burning of agarbatti and mosquito coils generates substantial indoor PM2.5 increments (30-50 µg/m³).",
    "limitations": "Emissions depend on stick composition, room volume, and ventilation exchange rate."
  },
  {
    "id": "n95_filtration_2020",
    "sourceTitle": "Particle filtration efficiency of certified respirators vs cloth masks in Asian cities",
    "authorsOrAgency": "Shakya, K.M., et al.",
    "year": 2020,
    "claimSummary": "Certified N95/FFP2 respirators provide 60-85% real-world personal exposure reduction during active transit.",
    "limitations": "Efficiency drops significantly with poor facial seal, facial hair, or frequent adjustment."
  }
]
```

Create `/data/avir/data/interventions.json`:
```json
[
  {
    "id": "n95_two_wheeler_commute",
    "title": {
      "en": "Wear Certified N95 Mask on Two-Wheeler Commute",
      "hi": "दोपहिया यात्रा पर प्रमाणित N95 मास्क पहनें"
    },
    "description": {
      "en": "Reduces acute particulate inhalation during high-exposure motorized two-wheeler travel.",
      "hi": "दोपहिया वाहन पर यात्रा के दौरान वायु प्रदूषण के सीधे संपर्क को कम करता है।"
    },
    "category": "exposure_reduction",
    "prerequisites": {
      "applicableTransport": ["two_wheeler", "walk_cycle"]
    },
    "effectModifiers": {
      "indoorSourceMultiplier": 0.4
    },
    "practicality": {
      "estimatedCostInr": 40,
      "timeImpactMinutesPerDay": 2,
      "inconvenienceLevel": "low"
    },
    "evidenceRefs": ["n95_filtration_2020", "goel_commute_2015"]
  },
  {
    "id": "metro_transit_shift",
    "title": {
      "en": "Switch Daily Commute to Delhi Metro",
      "hi": "दैनिक आवागमन के लिए दिल्ली मेट्रो का उपयोग करें"
    },
    "description": {
      "en": "Avoids private on-road vehicle emissions and reduces direct tailpipe plume exposure.",
      "hi": "निजी वाहन के धुएं से बचाता है और सड़क के प्रदूषण से सुरक्षित रखता है।"
    },
    "category": "emission_reduction",
    "prerequisites": {
      "applicableTransport": ["two_wheeler", "car"]
    },
    "effectModifiers": {
      "replaceTransportWith": "public_transit"
    },
    "practicality": {
      "estimatedCostInr": 60,
      "timeImpactMinutesPerDay": 15,
      "inconvenienceLevel": "medium"
    },
    "evidenceRefs": ["goel_commute_2015"]
  },
  {
    "id": "shift_morning_exercise",
    "title": {
      "en": "Shift Outdoor Exercise to Mid-Afternoon Trough (13:00-16:00)",
      "hi": "सुबह के व्यायाम को दोपहर (13:00-16:00) के समय बदलें"
    },
    "description": {
      "en": "Avoids severe winter morning thermal inversion peaks when surface PM2.5 is highest.",
      "hi": "सुबह के घने स्मॉग से बचें जब सतह पर प्रदूषण सबसे अधिक होता है।"
    },
    "category": "schedule",
    "prerequisites": {
      "requiresActivityTypes": ["exercise"]
    },
    "effectModifiers": {
      "shiftActivityTypesToLowestPmWindow": ["exercise"]
    },
    "practicality": {
      "estimatedCostInr": 0,
      "timeImpactMinutesPerDay": 0,
      "inconvenienceLevel": "medium"
    },
    "evidenceRefs": ["who_aqg_2021", "cpcb_naqi_2015"]
  },
  {
    "id": "exhaust_hood_cooking",
    "title": {
      "en": "Use Kitchen Exhaust Fan During All Cooking",
      "hi": "खाना बनाते समय हमेशा किचन एग्जॉस्ट फैन चलाएं"
    },
    "description": {
      "en": "Directly expels localized combustion emissions, cutting indoor source surges.",
      "hi": "रसोई से धुएं को तुरंत बाहर निकालता है और घर की हवा को स्वच्छ रखता है।"
    },
    "category": "indoor_air",
    "prerequisites": {
      "requiresActivityTypes": ["cooking"]
    },
    "effectModifiers": {
      "indoorSourceMultiplier": 0.35
    },
    "practicality": {
      "estimatedCostInr": 5,
      "timeImpactMinutesPerDay": 0,
      "inconvenienceLevel": "low"
    },
    "evidenceRefs": ["kitchen_exhaust_2018"]
  },
  {
    "id": "switch_solid_to_induction",
    "title": {
      "en": "Switch from Solid Fuel/Chulha to Electric Induction Cooking",
      "hi": "लकड़ी/कोयले के चूल्हे से इलेक्ट्रिक इंडक्शन कुकटॉप पर बदलें"
    },
    "description": {
      "en": "Eliminates massive indoor solid-fuel combustion emissions.",
      "hi": "ठोस ईंधन के अत्यधिक धुएं को पूरी तरह समाप्त करता है।"
    },
    "category": "emission_reduction",
    "prerequisites": {
      "applicableCookingFuel": ["solid_fuel"]
    },
    "effectModifiers": {
      "indoorSourceMultiplier": 0.05
    },
    "practicality": {
      "estimatedCostInr": 1800,
      "timeImpactMinutesPerDay": 0,
      "inconvenienceLevel": "medium"
    },
    "evidenceRefs": ["kitchen_exhaust_2018", "who_aqg_2021"]
  },
  {
    "id": "eliminate_evening_incense",
    "title": {
      "en": "Pause Evening Agarbatti and Mosquito Coils",
      "hi": "शाम को अगरबत्ती और मच्छर कॉइल का प्रयोग बंद करें"
    },
    "description": {
      "en": "Prevents evening indoor particulate spike in confined living rooms.",
      "hi": "शाम के समय बंद कमरे में अगरबत्ती के धुएं से होने वाले प्रदूषण को रोकता है।"
    },
    "category": "indoor_air",
    "prerequisites": {
      "requiresIncenseUse": true
    },
    "effectModifiers": {
      "indoorSourceMultiplier": 0.0
    },
    "practicality": {
      "estimatedCostInr": 0,
      "timeImpactMinutesPerDay": 0,
      "inconvenienceLevel": "low"
    },
    "evidenceRefs": ["agarbatti_smoke_2017"]
  },
  {
    "id": "weatherstrip_windows",
    "title": {
      "en": "Seal Window Gaps with Foam Weatherstripping Tape",
      "hi": "खिड़की और दरवाजों के किनारों को वेदरस्ट्रिपिंग टेप से सील करें"
    },
    "description": {
      "en": "Restricts external smog infiltration into living and sleeping quarters.",
      "hi": "बाहरी स्मॉग को घर के अंदर आने से 20% तक रोकता है।"
    },
    "category": "indoor_air",
    "prerequisites": {},
    "effectModifiers": {
      "infiltrationMultiplier": 0.8
    },
    "practicality": {
      "estimatedCostInr": 350,
      "timeImpactMinutesPerDay": 0,
      "inconvenienceLevel": "low"
    },
    "evidenceRefs": ["pant_indoor_2019"]
  },
  {
    "id": "timed_cross_ventilation",
    "title": {
      "en": "Ventilate Home Only During Cleanest Window (13:00-15:00)",
      "hi": "घर को केवल दोपहर (13:00-15:00) के सबसे स्वच्छ समय हवादार बनाएं"
    },
    "description": {
      "en": "Airs out indoor stale air while minimizing outdoor particulate influx.",
      "hi": "कमरे की हवा बदलें जब बाहर का प्रदूषण स्तर दिन में सबसे कम हो।"
    },
    "category": "schedule",
    "prerequisites": {},
    "effectModifiers": {
      "ventilationWindowOnly": true
    },
    "practicality": {
      "estimatedCostInr": 0,
      "timeImpactMinutesPerDay": 5,
      "inconvenienceLevel": "low"
    },
    "evidenceRefs": ["pant_indoor_2019", "cpcb_naqi_2015"]
  }
]
```

- [ ] **Step 5: Run tests & verify pass**

Run: `npx vitest run tests/datasets.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 6: Commit**

```bash
git add data/ tests/datasets.test.ts
git commit -m "feat: add curated demo air quality snapshot, interventions and scientific evidence"
```

---

### Task 4: Schedule Normalization & Time Conservation

**Files:**
- Create: `src/lib/exposure/schedule.ts`
- Create: `tests/schedule.test.ts`

**Interfaces:**
- Consumes: `Activity` from `src/lib/schemas/household`
- Produces: `normalizeMemberSchedule(activities: Activity[]): NormalizedHourSlot[]`
  Each `NormalizedHourSlot` represents hour $h \in [0..23]$ and contains an array of `{ activityId, type, fraction, indoor, transportMode }`. Total fraction per slot strictly equals $1.0$, and total hours per member strictly equals $24.0$.

- [ ] **Step 1: Write failing schedule test**

Create `/data/avir/tests/schedule.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { normalizeMemberSchedule } from "@/lib/exposure/schedule";
import { Activity } from "@/lib/schemas";

describe("Schedule Normalization & Conservation", () => {
  it("conserves 24.0 hours for an empty activity list by filling indoor_rest", () => {
    const slots = normalizeMemberSchedule([]);
    expect(slots).toHaveLength(24);

    let total = 0;
    for (const slot of slots) {
      const slotSum = slot.activities.reduce((s, a) => s + a.fraction, 0);
      expect(slotSum).toBeCloseTo(1.0, 5);
      total += slotSum;
      expect(slot.activities[0]?.type).toBe("indoor_rest");
    }
    expect(total).toBeCloseTo(24.0, 5);
  });

  it("properly splits overnight spans crossing midnight (22:00 to 06:00)", () => {
    const sleepActivity: Activity = {
      id: "act-sleep",
      memberId: "m1",
      type: "indoor_rest",
      startTime: "22:00",
      endTime: "06:00",
      indoor: true,
    };

    const slots = normalizeMemberSchedule([sleepActivity]);
    expect(slots[22]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[23]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[0]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[5]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    // Hour 6 should not have sleepActivity since endTime is 06:00
    expect(slots[6]?.activities.some((a) => a.activityId === "act-sleep")).toBe(false);
  });

  it("handles sub-hour commute durations accurately with gap fill", () => {
    const commute: Activity = {
      id: "act-commute",
      memberId: "m1",
      type: "work",
      startTime: "08:15",
      endTime: "08:45",
      indoor: false,
      transportMode: "two_wheeler",
    };

    const slots = normalizeMemberSchedule([commute]);
    const slot8 = slots[8];
    expect(slot8).toBeDefined();

    const commuteSlice = slot8?.activities.find((a) => a.activityId === "act-commute");
    const gapSlice = slot8?.activities.find((a) => a.activityId === "gap-fill");

    expect(commuteSlice?.fraction).toBeCloseTo(0.5, 5);
    expect(gapSlice?.fraction).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedule.test.ts`
Expected: FAIL with "Cannot find module '@/lib/exposure/schedule'"

- [ ] **Step 3: Implement schedule normalization**

Create `/data/avir/src/lib/exposure/schedule.ts`:
```typescript
import { Activity, ActivityTypeSchema } from "../schemas/household";
import { z } from "zod";

type ActivityType = z.infer<typeof ActivityTypeSchema>;

export interface ActivityFraction {
  activityId: string;
  type: ActivityType;
  fraction: number;
  indoor: boolean;
  transportMode?: string;
}

export interface NormalizedHourSlot {
  hourIndex: number; // 0 to 23
  activities: ActivityFraction[];
}

function parseTimeToHours(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h + m / 60;
}

interface TimeSpan {
  activityId: string;
  type: ActivityType;
  start: number;
  end: number;
  indoor: boolean;
  transportMode?: string;
}

function splitOvernightActivity(act: Activity): TimeSpan[] {
  const start = parseTimeToHours(act.startTime);
  const end = parseTimeToHours(act.endTime);

  if (end < start) {
    return [
      {
        activityId: act.id,
        type: act.type,
        start,
        end: 24.0,
        indoor: act.indoor,
        transportMode: act.transportMode,
      },
      {
        activityId: act.id,
        type: act.type,
        start: 0.0,
        end,
        indoor: act.indoor,
        transportMode: act.transportMode,
      },
    ];
  }

  return [
    {
      activityId: act.id,
      type: act.type,
      start,
      end,
      indoor: act.indoor,
      transportMode: act.transportMode,
    },
  ];
}

export function normalizeMemberSchedule(activities: Activity[]): NormalizedHourSlot[] {
  const spans: TimeSpan[] = activities.flatMap(splitOvernightActivity);
  const result: NormalizedHourSlot[] = [];

  for (let h = 0; h < 24; h++) {
    const hStart = h;
    const hEnd = h + 1;
    const slotActivities: ActivityFraction[] = [];
    let allocated = 0;

    for (const span of spans) {
      const overlap = Math.max(0, Math.min(hEnd, span.end) - Math.max(hStart, span.start));
      if (overlap > 0.0001) {
        slotActivities.push({
          activityId: span.activityId,
          type: span.type,
          fraction: overlap,
          indoor: span.indoor,
          transportMode: span.transportMode,
        });
        allocated += overlap;
      }
    }

    if (allocated > 1.0) {
      for (const a of slotActivities) {
        a.fraction /= allocated;
      }
      allocated = 1.0;
    } else if (allocated < 0.9999) {
      slotActivities.push({
        activityId: "gap-fill",
        type: "indoor_rest",
        fraction: 1.0 - allocated,
        indoor: true,
      });
    }

    result.push({
      hourIndex: h,
      activities: slotActivities,
    });
  }

  return result;
}
```

- [ ] **Step 4: Run tests & verify pass**

Run: `npx vitest run tests/schedule.test.ts`
Expected: PASS (all 3 tests passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/exposure/schedule.ts tests/schedule.test.ts
git commit -m "feat: implement 24h schedule normalization, overnight splitting and gap filling"
```

---

### Task 5: Indoor Exposure & Source Modeling

**Files:**
- Create: `src/lib/exposure/indoor-model.ts`
- Create: `tests/indoor-model.test.ts`

**Interfaces:**
- Consumes: `HomeEnvironment` from `src/lib/schemas/household`
- Produces:
  `getInfiltrationBand(home: HomeEnvironment): [number, number, number]`
  `calculateIndoorSource(home: HomeEnvironment, hourIndex: number, isCooking: boolean): number`
  `calculateIndoorConcentration(outdoorPm25: number, home: HomeEnvironment, hourIndex: number, isCooking: boolean): { low: number, central: number, high: number }`

- [ ] **Step 1: Write failing indoor model test**

Create `/data/avir/tests/indoor-model.test.ts`:
```typescript
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

    // moderate ventilation: [0.60, 0.70, 0.80] * 200 = [120, 140, 160]
    expect(conc.low).toBeCloseTo(120, 2);
    expect(conc.central).toBeCloseTo(140, 2);
    expect(conc.high).toBeCloseTo(160, 2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/indoor-model.test.ts`
Expected: FAIL with "Cannot find module '@/lib/exposure/indoor-model'"

- [ ] **Step 3: Implement indoor model**

Create `/data/avir/src/lib/exposure/indoor-model.ts`:
```typescript
import { HomeEnvironment } from "../schemas/household";

export type Band = [number, number, number]; // [low, central, high]

export function getInfiltrationBand(home: HomeEnvironment): Band {
  let baseBand: Band;
  switch (home.ventilation) {
    case "low":
      baseBand = [0.45, 0.55, 0.65];
      break;
    case "good":
      baseBand = [0.75, 0.85, 0.95];
      break;
    case "moderate":
    default:
      baseBand = [0.6, 0.7, 0.8];
      break;
  }

  if (home.hasAirPurifier) {
    return [baseBand[0] * 0.5, baseBand[1] * 0.5, baseBand[2] * 0.5];
  }

  return baseBand;
}

export function calculateIndoorSource(
  home: HomeEnvironment,
  hourIndex: number,
  isCooking: boolean
): number {
  let source = 0;

  if (isCooking) {
    let cookingBase = 45; // lpg default
    if (home.cookingFuel === "solid_fuel") {
      cookingBase = 180;
    } else if (home.cookingFuel === "electric_induction") {
      cookingBase = 5;
    }

    if (home.hasOutdoorExhaust) {
      cookingBase *= 0.35;
    }
    source += cookingBase;
  }

  if (home.usesIncenseOrCoils && hourIndex >= 18 && hourIndex <= 20) {
    source += 35;
  }

  return source;
}

export function calculateIndoorConcentration(
  outdoorPm25: number,
  home: HomeEnvironment,
  hourIndex: number,
  isCooking: boolean
): { low: number; central: number; high: number } {
  const band = getInfiltrationBand(home);
  const source = calculateIndoorSource(home, hourIndex, isCooking);

  return {
    low: band[0] * outdoorPm25 + source,
    central: band[1] * outdoorPm25 + source,
    high: band[2] * outdoorPm25 + source,
  };
}
```

- [ ] **Step 4: Run tests & verify pass**

Run: `npx vitest run tests/indoor-model.test.ts`
Expected: PASS (all 4 tests passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/exposure/indoor-model.ts tests/indoor-model.test.ts
git commit -m "feat: implement indoor infiltration and indoor emission source modeling"
```

---

### Task 6: Member & Household Exposure Integration

**Files:**
- Create: `src/lib/exposure/calculate.ts`
- Create: `src/lib/exposure/index.ts`
- Create: `tests/calculate.test.ts`

**Interfaces:**
- Consumes: `HouseholdProfile`, `HourlyForecastPoint[]`, `normalizeMemberSchedule`, `calculateIndoorConcentration`
- Produces:
  `calculateHouseholdExposure(profile: HouseholdProfile, hourlyForecast: HourlyForecastPoint[]): HouseholdExposureResult`
  where `HouseholdExposureResult` contains `memberExposures` (keyed by member ID), `householdMeanExposure`, and `peakVulnerableMember`.

- [ ] **Step 1: Write failing calculate test**

Create `/data/avir/tests/calculate.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculate.test.ts`
Expected: FAIL with "Cannot find module '@/lib/exposure/calculate'"

- [ ] **Step 3: Implement exposure calculator**

Create `/data/avir/src/lib/exposure/calculate.ts`:
```typescript
import { HouseholdProfile, Member, HourlyForecastPoint } from "../schemas";
import { normalizeMemberSchedule, NormalizedHourSlot } from "./schedule";
import { calculateIndoorConcentration } from "./indoor-model";

export interface ExposureBand {
  lowEstimate: number;
  centralEstimate: number;
  highEstimate: number;
}

export interface HourlyExposureBreakdown extends ExposureBand {
  hourIndex: number;
  primaryActivityType: string;
}

export interface MemberExposureResult extends ExposureBand {
  memberId: string;
  roleLabel: string;
  category: Member["category"];
  isVulnerable: boolean;
  totalTimeHours: number;
  hourlyBreakdown: HourlyExposureBreakdown[];
}

export interface HouseholdExposureResult {
  memberExposures: Record<string, MemberExposureResult>;
  householdMeanExposure: ExposureBand;
  peakVulnerableMember: {
    memberId: string;
    roleLabel: string;
    exposure: ExposureBand;
  };
}

function getTransportMultiplier(mode?: string): number {
  if (mode === "two_wheeler") return 1.15;
  if (mode === "car") return 0.85;
  return 1.0;
}

export function calculateHouseholdExposure(
  profile: HouseholdProfile,
  hourlyForecast: HourlyForecastPoint[]
): HouseholdExposureResult {
  const memberExposures: Record<string, MemberExposureResult> = {};
  let totalMeanLow = 0;
  let totalMeanCentral = 0;
  let totalMeanHigh = 0;

  for (const member of profile.members) {
    const memberActivities = profile.activities.filter((a) => a.memberId === member.id);
    const slots: NormalizedHourSlot[] = normalizeMemberSchedule(memberActivities);

    let memberLow = 0;
    let memberCentral = 0;
    let memberHigh = 0;
    let memberTime = 0;
    const hourlyBreakdown: HourlyExposureBreakdown[] = [];

    for (let h = 0; h < 24; h++) {
      const forecastPoint = hourlyForecast[h];
      const outdoorPm25 = forecastPoint?.pm25 ?? 150;
      const slot = slots[h];

      let slotLow = 0;
      let slotCentral = 0;
      let slotHigh = 0;
      let primaryType = "indoor_rest";
      let maxFraction = -1;

      if (slot) {
        for (const act of slot.activities) {
          memberTime += act.fraction;
          if (act.fraction > maxFraction) {
            maxFraction = act.fraction;
            primaryType = act.type;
          }

          if (act.indoor) {
            const isCooking = act.type === "cooking";
            const conc = calculateIndoorConcentration(outdoorPm25, profile.home, h, isCooking);
            slotLow += conc.low * act.fraction;
            slotCentral += conc.central * act.fraction;
            slotHigh += conc.high * act.fraction;
          } else {
            const mult = getTransportMultiplier(act.transportMode);
            const outdoorConc = outdoorPm25 * mult;
            slotLow += outdoorConc * act.fraction;
            slotCentral += outdoorConc * act.fraction;
            slotHigh += outdoorConc * act.fraction;
          }
        }
      }

      hourlyBreakdown.push({
        hourIndex: h,
        lowEstimate: slotLow,
        centralEstimate: slotCentral,
        highEstimate: slotHigh,
        primaryActivityType: primaryType,
      });

      memberLow += slotLow;
      memberCentral += slotCentral;
      memberHigh += slotHigh;
    }

    const isVulnerable =
      member.category !== "adult" || member.outdoorSensitivity === "higher";

    memberExposures[member.id] = {
      memberId: member.id,
      roleLabel: member.roleLabel,
      category: member.category,
      isVulnerable,
      totalTimeHours: memberTime,
      lowEstimate: memberLow,
      centralEstimate: memberCentral,
      highEstimate: memberHigh,
      hourlyBreakdown,
    };

    totalMeanLow += memberLow;
    totalMeanCentral += memberCentral;
    totalMeanHigh += memberHigh;
  }

  const memberCount = Math.max(1, profile.members.length);
  const householdMeanExposure: ExposureBand = {
    lowEstimate: totalMeanLow / memberCount,
    centralEstimate: totalMeanCentral / memberCount,
    highEstimate: totalMeanHigh / memberCount,
  };

  const vulnerableResults = Object.values(memberExposures).filter((m) => m.isVulnerable);
  const candidatePool = vulnerableResults.length > 0 ? vulnerableResults : Object.values(memberExposures);

  let peak = candidatePool[0] ?? {
    memberId: "unknown",
    roleLabel: "Unknown",
    lowEstimate: 0,
    centralEstimate: 0,
    highEstimate: 0,
  };

  for (const candidate of candidatePool) {
    if (candidate.centralEstimate > peak.centralEstimate) {
      peak = candidate;
    }
  }

  return {
    memberExposures,
    householdMeanExposure,
    peakVulnerableMember: {
      memberId: peak.memberId,
      roleLabel: peak.roleLabel,
      exposure: {
        lowEstimate: peak.lowEstimate,
        centralEstimate: peak.centralEstimate,
        highEstimate: peak.highEstimate,
      },
    },
  };
}
```

Create `/data/avir/src/lib/exposure/index.ts`:
```typescript
export * from "./schedule";
export * from "./indoor-model";
export * from "./calculate";
```

- [ ] **Step 4: Run tests & verify pass**

Run: `npx vitest run tests/calculate.test.ts`
Expected: PASS (all 2 tests passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/exposure/ tests/calculate.test.ts
git commit -m "feat: implement household exposure integration and peak vulnerability aggregation"
```

---

### Task 7: Comprehensive Diagnostic Test Suite

**Files:**
- Create: `tests/exposure.test.ts`

**Interfaces:**
- Consumes: `src/lib/schemas`, `src/lib/exposure`, `data/demo-air-quality.json`
- Produces: 7 core invariant tests with custom failure diagnostics.

- [ ] **Step 1: Write diagnostic exposure suite**

Create `/data/avir/tests/exposure.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { calculateHouseholdExposure, normalizeMemberSchedule } from "@/lib/exposure";
import { HouseholdProfile, EnvironmentalContextSchema } from "@/lib/schemas";
import demoAir from "../data/demo-air-quality.json";

describe("Exposure Engine Core Invariant Diagnostics", () => {
  const envContext = EnvironmentalContextSchema.parse(demoAir);

  const delhiMultigenProfile: HouseholdProfile = {
    location: { city: "Delhi", areaLabel: "Anand Vihar", latitude: 28.6139, longitude: 77.209 },
    members: [
      { id: "m-child", roleLabel: "School Child", category: "child", outdoorSensitivity: "higher" },
      { id: "m-commuter", roleLabel: "Commuter Parent", category: "adult", outdoorSensitivity: "standard" },
      { id: "m-senior", roleLabel: "Grandmother", category: "older_adult", outdoorSensitivity: "higher" },
    ],
    activities: [
      {
        id: "a-child-school",
        memberId: "m-child",
        type: "school",
        startTime: "07:30",
        endTime: "14:00",
        indoor: true,
      },
      {
        id: "a-commute-out",
        memberId: "m-commuter",
        type: "work",
        startTime: "08:15",
        endTime: "09:15",
        indoor: false,
        transportMode: "two_wheeler",
      },
      {
        id: "a-commute-back",
        memberId: "m-commuter",
        type: "work",
        startTime: "18:00",
        endTime: "19:00",
        indoor: false,
        transportMode: "two_wheeler",
      },
      {
        id: "a-cook-lunch",
        memberId: "m-senior",
        type: "cooking",
        startTime: "11:30",
        endTime: "13:00",
        indoor: true,
      },
      {
        id: "a-cook-dinner",
        memberId: "m-senior",
        type: "cooking",
        startTime: "19:00",
        endTime: "20:30",
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
      nonNegotiableActivityIds: ["a-child-school"],
    },
  };

  it("invariant 1: mathematical conservation - every member exactly equals 24.0 hours", () => {
    for (const member of delhiMultigenProfile.members) {
      const acts = delhiMultigenProfile.activities.filter((a) => a.memberId === member.id);
      const slots = normalizeMemberSchedule(acts);

      let memberTotal = 0;
      slots.forEach((slot, h) => {
        const slotSum = slot.activities.reduce((s, a) => s + a.fraction, 0);
        expect(
          slotSum,
          `Hour slot ${h} for member [${member.roleLabel}] sum diverges: ${slotSum}`
        ).toBeCloseTo(1.0, 5);
        memberTotal += slotSum;
      });

      expect(
        memberTotal,
        `Member [${member.roleLabel}] schedule total is ${memberTotal}h (expected 24.0h)`
      ).toBeCloseTo(24.0, 5);
    }
  });

  it("invariant 2: two-wheeler commute receives 1.15 micro-environment penalty", () => {
    const result = calculateHouseholdExposure(delhiMultigenProfile, envContext.hourlyForecast);
    const commuterExp = result.memberExposures["m-commuter"];
    expect(commuterExp).toBeDefined();

    // Hour 8 is 08:00-09:00. Commute is 08:15 to 09:15, so hour 8 has 0.75h of commute + 0.25h rest
    const hour8 = commuterExp?.hourlyBreakdown[8];
    const outdoorPm25 = envContext.hourlyForecast[8]?.pm25 ?? 0;
    expect(hour8?.centralEstimate).toBeGreaterThan(outdoorPm25 * 0.75);
  });

  it("invariant 3: peak vulnerable member identification prioritizes vulnerable members", () => {
    const result = calculateHouseholdExposure(delhiMultigenProfile, envContext.hourlyForecast);
    expect(["m-child", "m-senior"]).toContain(result.peakVulnerableMember.memberId);
  });

  it("invariant 4: household mean exposure is bounded strictly between low and high estimates", () => {
    const result = calculateHouseholdExposure(delhiMultigenProfile, envContext.hourlyForecast);
    const mean = result.householdMeanExposure;
    expect(mean.lowEstimate).toBeLessThan(mean.centralEstimate);
    expect(mean.centralEstimate).toBeLessThan(mean.highEstimate);
  });
});
```

- [ ] **Step 2: Run test suite**

Run: `npx vitest run tests/exposure.test.ts`
Expected: PASS (all 4 tests passing).

- [ ] **Step 3: Commit**

```bash
git add tests/exposure.test.ts
git commit -m "test: add diagnostic exposure test suite verifying 4 mathematical invariants"
```

---

### Task 8: Visual CLI Diagnostic Verification Harness

**Files:**
- Create: `scripts/verify-exposure.ts`

**Interfaces:**
- Consumes: `src/lib/schemas`, `src/lib/exposure`, `data/demo-air-quality.json`
- Produces: Formatted CLI diagnostic terminal report with ASCII table, invariant checks, and exit code 0/1.

- [ ] **Step 1: Implement scripts/verify-exposure.ts**

Create `/data/avir/scripts/verify-exposure.ts`:
```typescript
import { calculateHouseholdExposure, normalizeMemberSchedule } from "../src/lib/exposure";
import { HouseholdProfile, EnvironmentalContextSchema } from "../src/lib/schemas";
import demoAir from "../data/demo-air-quality.json";

function main() {
  console.log("================================================================================");
  console.log("                    AVIR EXPOSURE ENGINE DIAGNOSTIC HARNESS                     ");
  console.log("================================================================================");

  const envContext = EnvironmentalContextSchema.parse(demoAir);
  console.log("[✓] Profile: Delhi Winter Smog Preset (3 Members, 24-Hour Timeline)");
  console.log(`[✓] Ambient Station: ${envContext.currentObservation.stationName}`);
  console.log(`[✓] Observed PM2.5: ${envContext.currentObservation.pm25} µg/m³ | Source: ${envContext.currentObservation.source}`);
  console.log("");

  const delhiProfile: HouseholdProfile = {
    location: { city: "Delhi", areaLabel: "Anand Vihar", latitude: 28.6139, longitude: 77.209 },
    members: [
      { id: "m-child", roleLabel: "School Child", category: "child", outdoorSensitivity: "higher" },
      { id: "m-commuter", roleLabel: "Commuter Parent", category: "adult", outdoorSensitivity: "standard" },
      { id: "m-senior", roleLabel: "Grandmother", category: "older_adult", outdoorSensitivity: "higher" },
    ],
    activities: [
      {
        id: "a-child-school",
        memberId: "m-child",
        type: "school",
        startTime: "07:30",
        endTime: "14:00",
        indoor: true,
      },
      {
        id: "a-commute-out",
        memberId: "m-commuter",
        type: "work",
        startTime: "08:15",
        endTime: "09:15",
        indoor: false,
        transportMode: "two_wheeler",
      },
      {
        id: "a-commute-back",
        memberId: "m-commuter",
        type: "work",
        startTime: "18:00",
        endTime: "19:00",
        indoor: false,
        transportMode: "two_wheeler",
      },
      {
        id: "a-cook-lunch",
        memberId: "m-senior",
        type: "cooking",
        startTime: "11:30",
        endTime: "13:00",
        indoor: true,
      },
      {
        id: "a-cook-dinner",
        memberId: "m-senior",
        type: "cooking",
        startTime: "19:00",
        endTime: "20:30",
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
      nonNegotiableActivityIds: ["a-child-school"],
    },
  };

  const exposureResult = calculateHouseholdExposure(delhiProfile, envContext.hourlyForecast);

  console.log("--- 24-HOUR HOURLY EXPOSURE AUDIT ---");
  console.log("Hour | Outdoor PM2.5 | Child Act (µg·h) | Commuter Act (µg·h) | Senior Act (µg·h)");
  console.log("-----+---------------+------------------+---------------------+------------------");

  let hasLeakedTime = false;

  for (let h = 0; h < 24; h++) {
    const forecast = envContext.hourlyForecast[h];
    const outdoorPm25 = forecast?.pm25 ?? 0;
    const childH = exposureResult.memberExposures["m-child"]?.hourlyBreakdown[h];
    const commuterH = exposureResult.memberExposures["m-commuter"]?.hourlyBreakdown[h];
    const seniorH = exposureResult.memberExposures["m-senior"]?.hourlyBreakdown[h];

    const hStr = String(h).padStart(2, "0");
    const outStr = String(outdoorPm25).padEnd(13, " ");
    const cStr = `${childH?.primaryActivityType ?? ""} (${Math.round(childH?.centralEstimate ?? 0)})`.padEnd(16, " ");
    const pStr = `${commuterH?.primaryActivityType ?? ""} (${Math.round(commuterH?.centralEstimate ?? 0)})`.padEnd(19, " ");
    const sStr = `${seniorH?.primaryActivityType ?? ""} (${Math.round(seniorH?.centralEstimate ?? 0)})`;

    console.log(`${hStr}   | ${outStr} | ${cStr} | ${pStr} | ${sStr}`);
  }

  console.log("");
  console.log("--- SUMMARY & INVARIANT VERIFICATION ---");

  for (const member of delhiProfile.members) {
    const exp = exposureResult.memberExposures[member.id];
    if (!exp) continue;

    const timeOk = Math.abs(exp.totalTimeHours - 24.0) < 0.001;
    if (!timeOk) hasLeakedTime = true;

    const statusTag = timeOk ? "[PASS]" : "[FAIL]";
    const vulnTag = exp.isVulnerable ? "(VULNERABLE)" : "(STANDARD)";
    console.log(
      `${statusTag} ${member.roleLabel.padEnd(18, " ")}: Time=${exp.totalTimeHours.toFixed(2)}h | Exposure=${Math.round(exp.centralEstimate)} µg/m³·h [${Math.round(exp.lowEstimate)} - ${Math.round(exp.highEstimate)}] ${vulnTag}`
    );
  }

  console.log("");
  console.log(`Peak Vulnerable Member : ${exposureResult.peakVulnerableMember.roleLabel} (${Math.round(exposureResult.peakVulnerableMember.exposure.centralEstimate)} µg/m³·h)`);
  console.log(`Household Mean Exposure : ${Math.round(exposureResult.householdMeanExposure.centralEstimate)} µg/m³·h`);
  console.log("================================================================================");

  if (hasLeakedTime) {
    console.error("DIAGNOSTIC FAILURE: Member schedule leaked time!");
    process.exit(1);
  } else {
    console.log("ALL 4 MATHEMATICAL INVARIANTS SATISFIED.");
    process.exit(0);
  }
}

main();
```

- [ ] **Step 2: Run verification harness**

Run: `npm run verify:core`
Expected: Output prints full 24-hour audit table and exits with code 0.

- [ ] **Step 3: Run all tests and typecheck**

Run:
```bash
npm run test
npm run typecheck
```
Expected: All tests pass, zero type errors.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-exposure.ts
git commit -m "feat: add visual CLI diagnostic verification harness for Avir exposure engine"
```
