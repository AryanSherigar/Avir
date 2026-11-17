# Specification 1: Avir Core Foundation & Deterministic Engines

| Metadata | Details |
| --- | --- |
| **Document ID** | SPEC-AVIR-001 |
| **Title** | Core Foundation, Domain Schemas & Deterministic Exposure Modeling |
| **System** | Avir (Smart Air Adaptation and Navigation System) |
| **Status** | Approved Design / Ready for Implementation Plan |
| **Author** | Antigravity AI Assistant & Engineering Team |
| **Date** | 2026-11-17 |

---

## 1. Executive Summary

This specification defines the foundation for **Avir**, a hybrid deterministic and GenAI household winter smog decision-support system tailored for budget-conscious multigenerational urban Indian households (defaulting to Delhi NCR).

Spec 1 establishes:
1. The project setup (Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, Vitest).
2. Pure runtime Zod schemas for household schedules, environmental contexts, and intervention rules (`src/lib/schemas/*`).
3. Curated static datasets for Delhi winter smog fallback, declarative intervention rules, and peer-reviewed scientific citations (`data/*.json`).
4. A 100% deterministic, pure TypeScript exposure engine (`src/lib/exposure/*`) calculating member-specific 24-hour time-activity exposure proxies ($E_{\text{proxy}, m}$ in $\mu\text{g/m}^3 \cdot \text{h}$) with complete mathematical time conservation (24.0 hours guaranteed).
5. A visual CLI diagnostic harness (`scripts/verify-exposure.ts`) and a comprehensive Vitest test suite (`tests/exposure.test.ts`) providing immediate visibility and fine-grained diagnostics into hourly calculations.

---

## 2. Architectural Boundaries & Code Quality Enforcements

In accordance with `AGENTS.md`, this specification enforces the following non-negotiable rules:

* **Strict Service Boundaries:**
  * `src/lib/schemas/*`: Pure Zod schemas and inferred TypeScript types. Zero external dependencies beyond Zod.
  * `src/lib/exposure/*`: Pure, deterministic TypeScript functions. Absolutely zero network `fetch` calls, zero `process.env`, zero browser APIs (`window`, `localStorage`), and zero AI/LLM imports.
* **Code Quality Directives:**
  * TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Zero `any` and zero `@ts-ignore`.
  * Small, focused functions under 40 lines.
  * Flat control flow (maximum 2 levels of nesting).
  * Source files kept strictly under 250 lines.
  * Zero dead code, zero commented-out code, zero debug `console.log` in committed runtime modules.
* **Repository Constraints:**
  * Public single branch (`main`).
  * Repository size strictly under 10 MB (zero committed heavy binary images, video files, or `.woff2` font bundles).

---

## 3. Directory & File Manifest

```text
/data/avir/
├── package.json                       # Next.js 15, React 19, TypeScript 5.7+, Tailwind, Vitest, Zod
├── tsconfig.json                      # Strict compiler flags
├── vitest.config.ts                   # Fast in-memory unit test runner
├── data/
│   ├── demo-air-quality.json          # Offline Delhi smog snapshot (PM2.5 diurnal curve)
│   ├── interventions.json             # 10 core declarative intervention rules (EN/HI)
│   └── evidence.json                  # Traceable scientific citations & methodology caveats
├── scripts/
│   └── verify-exposure.ts             # Diagnostic visual CLI harness with formatted ASCII tables
├── src/
│   └── lib/
│       ├── schemas/
│       │   ├── household.ts           # Location, Member, Activity, Home, Constraints Zod schemas
│       │   ├── air.ts                 # Observation, HourlyPoint, Context Zod schemas
│       │   ├── interventions.ts       # InterventionRule & EvaluatedIntervention schemas
│       │   └── index.ts               # Barrel exports
│       └── exposure/
│           ├── schedule.ts            # Overnight splitting & 24.0h gap filling
│           ├── indoor-model.ts        # Infiltration band (F_i) & Indoor source terms (S_i)
│           └── calculate.ts           # Time-activity exposure integrator (E_proxy,m)
└── tests/
    └── exposure.test.ts               # Vitest suite with rich failure diagnostics
```

---

## 4. Domain Schemas (`src/lib/schemas/`)

### 4.1 Household Profile Schema (`src/lib/schemas/household.ts`)

```typescript
import { z } from "zod";

export const LocationSchema = z.object({
  city: z.string().min(2).max(60).regex(/^[a-zA-Z\s.-]+$/),
  areaLabel: z.string().min(2).max(100).optional(),
  latitude: z.number().min(-90).max(90).default(28.6139),
  longitude: z.number().min(-180).max(180).default(77.2090),
});

export const MemberSchema = z.object({
  id: z.string().min(1),
  roleLabel: z.string().min(1).max(50), // e.g. "School Child", "Commuting Parent", "Grandmother"
  category: z.enum(["child", "adult", "older_adult"]),
  outdoorSensitivity: z.enum(["standard", "higher"]),
});

export const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ActivitySchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  type: z.enum(["school", "work", "cooking", "exercise", "indoor_rest", "errands"]),
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  indoor: z.boolean(),
  transportMode: z.enum(["two_wheeler", "car", "public_transit", "walk_cycle", "none"]).optional(),
  commuteDistanceKm: z.number().min(0).max(150).optional(),
  originLabel: z.string().max(100).optional(),
  destinationLabel: z.string().max(100).optional(),
});

export const HomeEnvironmentSchema = z.object({
  ventilation: z.enum(["low", "moderate", "good"]),
  cookingFuel: z.enum(["lpg", "electric_induction", "solid_fuel"]),
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

export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type HomeEnvironment = z.infer<typeof HomeEnvironmentSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
```

### 4.2 Air Quality & Environmental Context Schema (`src/lib/schemas/air.ts`)

```typescript
import { z } from "zod";

export const CurrentObservationSchema = z.object({
  stationName: z.string().min(1),
  city: z.string().min(1),
  source: z.enum(["cpcb", "open_meteo_current", "demo"]),
  observedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T.*$/)),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  officialNaqi: z.number().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  distanceKm: z.number().min(0).optional(),
});

export const HourlyForecastPointSchema = z.object({
  hourIndex: z.number().int().min(0).max(23),
  isoTime: z.string(),
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

### 4.3 Intervention Rule & Evidence Schema (`src/lib/schemas/interventions.ts`)

```typescript
import { z } from "zod";

export const BilingualTextSchema = z.object({
  en: z.string().min(1),
  hi: z.string().min(1),
});

export const InterventionRuleSchema = z.object({
  id: z.string().min(1),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  category: z.enum(["exposure_reduction", "emission_reduction", "indoor_air", "schedule"]),
  prerequisites: z.object({
    requiresActivityTypes: z.array(z.enum(["school", "work", "cooking", "exercise", "errands"])).optional(),
    applicableTransport: z.array(z.enum(["two_wheeler", "car", "walk_cycle"])).optional(),
    applicableCookingFuel: z.array(z.enum(["lpg", "solid_fuel"])).optional(),
    requiresIncenseUse: z.boolean().optional(),
    requiresNoPurifier: z.boolean().optional(),
    requiresPurifier: z.boolean().optional(),
  }),
  effectModifiers: z.object({
    infiltrationMultiplier: z.number().positive().max(1.0).optional(),
    indoorSourceMultiplier: z.number().positive().max(1.0).optional(),
    shiftActivityTypesToLowestPmWindow: z.array(z.enum(["exercise", "errands"])).optional(),
    replaceTransportWith: z.literal("public_transit").optional(),
    ventilationWindowOnly: z.boolean().optional(),
  }),
  practicality: z.object({
    estimatedCostInr: z.number().min(0),
    timeImpactMinutesPerDay: z.number(),
    inconvenienceLevel: z.enum(["low", "medium", "high"]),
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

---

## 5. Curated Static Datasets (`data/`)

1. **`data/demo-air-quality.json`:**
   * Realistic Delhi severe winter smog snapshot (`source: "demo"`).
   * Observed: Anand Vihar station, $\text{PM}_{2.5} = 345\,\mu\text{g/m}^3$, $\text{PM}_{10} = 480\,\mu\text{g/m}^3$, NAQI = 422 (Severe).
   * 24-hour diurnal forecast: Surface inversion peaks at 07:00 ($380\,\mu\text{g/m}^3$) and 22:00 ($395\,\mu\text{g/m}^3$); solar heating vertical dispersion trough at 14:00 ($140\,\mu\text{g/m}^3$).
2. **`data/interventions.json`:**
   * 10 core evidence-based interventions:
     1. `n95_two_wheeler_commute`: Wear certified N95 mask during two-wheeler commute ($60\%$ effective exposure reduction).
     2. `metro_transit_shift`: Replace two-wheeler/car commute with Delhi Metro (avoids private vehicle km and cuts commute exposure).
     3. `shift_morning_exercise`: Shift outdoor morning exercise from 06:00 to 14:00 solar trough window.
     4. `weatherstrip_windows`: Seal exterior door and window perimeter gaps with rubber tape (reduces infiltration by $20\%$).
     5. `exhaust_hood_cooking`: Run active kitchen exhaust fan during all cooking periods (cuts indoor cooking term by $65\%$).
     6. `switch_solid_to_induction`: Substitute biomass/solid fuel cooking with electric induction plate.
     7. `eliminate_evening_incense`: Eliminate evening agarbatti/dhoop burning (eliminates $+35\,\mu\text{g/m}^3$ peak indoor source).
     8. `closed_window_transit`: Keep car windows rolled up with recirculated AC enabled.
     9. `timed_cross_ventilation`: Restrict household airing to the 3-hour minimum ambient PM2.5 trough (13:00–16:00).
     10. `hepa_filter_rest_room`: Run HEPA air purifier in main bedroom/living rest area.
3. **`data/evidence.json`:**
   * 8 traceable scientific entries citing CPCB CAAQMS guidelines, ICMR Delhi air pollution health studies, WHO 2021 Global Air Quality Guidelines, and peer-reviewed indoor infiltration literature (Pant et al., Goel et al.).
   * Every entry contains explicit limitations (e.g., "Field filtration efficacy depends on facial seal", "Ambient proxy does not compute clinical lung deposition").

---

## 6. Exposure Engine Specification (`src/lib/exposure/`)

### 6.1 Schedule Normalization & Conservation (`schedule.ts`)

Let $A_m$ be the set of scheduled activities for member $m$.

1. **Time Parsing:**
   Time strings `HH:MM` are converted to fractional hour floats:
   $$t_{\text{float}} = \text{hours} + \frac{\text{minutes}}{60}$$
2. **Overnight Interval Splitting:**
   If $t_{\text{end}} < t_{\text{start}}$, split the activity into:
   * Interval 1: $[t_{\text{start}}, 24.0]$
   * Interval 2: $[0.0, t_{\text{end}}]$
3. **Discretization into 24 One-Hour Slots ($h \in \{0, \dots, 23\}$):**
   For hour slot $h$ representing $[h, h+1]$, the overlap duration $d(h, [s, e])$ of an interval $[s, e]$ is:
   $$d(h, [s, e]) = \max(0, \min(h+1, e) - \max(h, s))$$
   The fraction of hour $h$ spent in activity $a$ is:
   $$t_{m,h,a} = \sum_{\text{slices of } a} d(h, [s, e])$$
4. **24.0-Hour Conservation & Default Gap Filling:**
   The total explicit scheduled time in hour $h$ is:
   $$T_{m,h} = \sum_{a \in A_m} t_{m,h,a}$$
   * If $T_{m,h} < 1.0$, allocate a synthetic gap-fill activity `indoor_rest` at home:
     $$t_{m,h,\text{gap}} = 1.0 - T_{m,h}$$
   * If $T_{m,h} > 1.0$ (due to user overlapping entries), normalize proportionally:
     $$t_{m,h,a} \leftarrow \frac{t_{m,h,a}}{T_{m,h}}$$
   * **Invariant:** For every member $m$:
     $$\sum_{h=0}^{23} \sum_{a} t_{m,h,a} \equiv 24.0 \quad (\pm 10^{-6})$$

### 6.2 Indoor Concentration Model (`indoor-model.ts`)

Indoor concentration for hour $h$ is calculated across 3 scenario bounds ($\text{low}, \text{central}, \text{high}$):
$$C_{\text{indoor}, h} = F_i \cdot C_{\text{outdoor}, h} + S_i$$

* **Infiltration Factor Band ($F_i$):**
  * `ventilation === "low"`: $[0.45, 0.55, 0.65]$
  * `ventilation === "moderate"`: $[0.60, 0.70, 0.80]$
  * `ventilation === "good"`: $[0.75, 0.85, 0.95]$
  * If `home.hasAirPurifier === true`:
    $$F_i \leftarrow F_i \times 0.50$$
* **Indoor Source Term ($S_i$ in $\mu\text{g/m}^3$):**
  * Cooking Term ($S_{\text{cook}}$): Active when activity is `cooking`:
    * `solid_fuel`: $+180\,\mu\text{g/m}^3$
    * `lpg`: $+45\,\mu\text{g/m}^3$
    * `electric_induction`: $+5\,\mu\text{g/m}^3$
    * If `home.hasOutdoorExhaust === true`:
      $$S_{\text{cook}} \leftarrow S_{\text{cook}} \times 0.35$$
  * Incense / Coil Term ($S_{\text{incense}}$): Active during evening hours ($h \in \{18, 19, 20\}$):
    * If `home.usesIncenseOrCoils === true`: $+35\,\mu\text{g/m}^3$
  * Total indoor source:
    $$S_i = S_{\text{cook}} + S_{\text{incense}}$$

### 6.3 Member & Household Exposure Integration (`calculate.ts`)

1. **Micro-Environment Concentration ($C_{m,h,a}$):**
   * If $a$ is `indoor === true`:
     $$C_{m,h,a} = C_{\text{indoor}, h}$$
   * If $a$ is `indoor === false`:
     $$C_{m,h,a} = C_{\text{outdoor}, h} \times M_{\text{transport}}$$
     where:
     * $M_{\text{two\_wheeler}} = 1.15$
     * $M_{\text{car}} = 0.85$
     * $M_{\text{walk\_cycle}} = 1.0$
     * $M_{\text{public\_transit}} = 1.0$
     * $M_{\text{none}} = 1.0$
2. **Member Exposure Proxy ($E_{\text{proxy}, m}$):**
   $$E_{\text{proxy}, m} = \sum_{h=0}^{23} \sum_{a} C_{m,h,a} \cdot t_{m,h,a}$$
   Evaluated for `lowEstimate`, `centralEstimate`, and `highEstimate` (in $\mu\text{g/m}^3 \cdot \text{h}$).
3. **Household Aggregates:**
   * `householdMeanExposure`: Average of $E_{\text{proxy}, m}$ across all members.
   * `vulnerableMembers`: Members with `category !== "adult"` or `outdoorSensitivity === "higher"`.
   * `peakVulnerableMember`: Member with the highest `centralEstimate` among `vulnerableMembers` (or highest overall member if no member is flagged vulnerable).

---

## 7. Testing, Diagnostics & Verification Harness

### 7.1 Visual Diagnostic CLI Harness (`scripts/verify-exposure.ts`)

* Executable via `npm run verify:core` or `npx tsx scripts/verify-exposure.ts`.
* Tests the Delhi multigenerational preset family (School Child, Two-Wheeler Commuting Parent, Grandmother).
* Outputs:
  1. A 24-row formatted ASCII table showing hour $00$ to $23$, outdoor $\text{PM}_{2.5}$, indoor baseline, member activity titles, and time allocations.
  2. A summary audit table for each member with exact hours (must be $24.00$), exposure proxy range, vulnerability tag, and peak vulnerable designation.
  3. Green `[PASS]` or Red `[FAIL]` indicators with exact numeric differences for all invariant properties.

### 7.2 Vitest Diagnostic Test Suite (`tests/exposure.test.ts`)

* **Conservation Check:** Runs 10 randomized and edge-case schedules; asserts $\sum t_{m,h,a} = 24.0 \pm 10^{-6}$ with custom failure messages displaying leaked hours.
* **Overnight Split Check:** Asserts that an activity spanning 22:30 to 06:15 allocates exactly $0.5$h to slot 22, $1.0$h to slot 23, $1.0$h each to slots 0–5, and $0.25$h to slot 6.
* **Infiltration Invariant Check:** Asserts $F_i(\text{good}) > F_i(\text{moderate}) > F_i(\text{low})$ and confirms air purifier reduces $F_i$ by $50\%$.
* **Source Term Invariant Check:** Asserts solid fuel $>$ LPG $>$ induction, verifies $65\%$ reduction from outdoor exhaust, and confirms incense term is strictly $0$ outside hours 18–20.
* **Peak Vulnerability Tagging:** Confirms children and older adults with `higher` sensitivity are selected over healthy adults with lower ambient exposure.
* **Zod Boundary Fuzzing:** Rejects invalid time strings (`"24:00"`, `"8:00"` lacking leading zero, `"abc"`), out-of-range coordinates, negative budgets, and empty member lists.

### 7.3 Verification Commands

```bash
# 1. Run visual diagnostic audit with formatted tables:
npm run verify:core

# 2. Run in-memory Vitest unit test suite:
npx vitest run tests/exposure.test.ts

# 3. Verify strict TypeScript compilation:
npx tsc --noEmit
```

---

## 8. Success Criteria & Sign-Off

Spec 1 is considered complete and ready for Spec 2 when:
1. `npm run verify:core` prints the formatted 24-hour audit table with 100% `[PASS]` checks.
2. `npx vitest run tests/exposure.test.ts` passes with zero failures.
3. `npx tsc --noEmit` exits with zero errors.
4. Total repository size remains strictly under 10 MB.
