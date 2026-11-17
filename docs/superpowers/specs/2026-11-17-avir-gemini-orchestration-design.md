# Specification 4: Avir Gemini Intelligence Layer & API Orchestration

| Metadata | Details |
| --- | --- |
| **Document ID** | SPEC-AVIR-004 |
| **Title** | Server-Side Gemini Orchestration, Structured Plan Synthesis, Tool Loop & Fallback |
| **System** | Avir (Smart Air Adaptation and Navigation System) |
| **Status** | Approved Design / Ready for Implementation Plan |
| **Author** | Antigravity AI Assistant & Engineering Team |
| **Date** | 2026-11-17 |

---

## 1. Executive Summary

This specification establishes the AI orchestration layer for **Avir**, coordinating Google Gemini (`gemini-2.5-flash` via `@google/genai`) to generate natural language explanations and interactive what-if reasoning in English and Hindi (`en` / `hi`).

To prevent the common pitfall of LLM arithmetic hallucinations and eliminate library conflicts between simultaneous `tools` declarations and `responseSchema` constraints, Spec 4 enforces two distinct patterns:
1. **Pattern A — Dashboard Plan Synthesis (`POST /api/plan`):** Pre-computes all exposure and intervention metrics in TypeScript, passing the compact metric summary to Gemini with `responseMimeType: "application/json"` and `responseSchema: PlanExplanationSchema` with **zero tools attached**.
2. **Pattern B — What-If Assistant (`POST /api/chat`):** A request-scoped, two-step function-calling loop over three deterministic tools (`get_household_exposure_breakdown`, `simulate_custom_routine`, `get_cleanest_outdoor_windows`).
3. **Deterministic Fallbacks:** If `GEMINI_API_KEY` is omitted, invalid, or times out (> 8s), both endpoints return deterministic template explanations (`aiFallback: true`), guaranteeing uninterrupted application functionality.
4. **Verification:** A visual CLI diagnostic harness (`scripts/verify-ai.ts`) and Vitest test suite.

---

## 2. Scientific & AI Architectural Enforcements

In accordance with `AGENTS.md` and `RFC.md`:

* **Zero LLM Arithmetic:** Gemini must never compute exposure concentrations, infiltration factors, percentage reductions, or avoided vehicle kilometers. All numbers are computed by deterministic TypeScript engines and supplied to Gemini as verified facts.
* **Never Fabricate Tailpipe Gram Emissions:** Avoided private transport is strictly reported in `privateVehicleKmAvoidedPerDay`. Gemini is explicitly instructed never to invent tailpipe gram emission factors.
* **No Medical Diagnoses or Cures:** System prompts forbid claims of clinical lung dose, disease diagnosis, or curative treatment. Output is strictly framed as environmental exposure proxies ($\mu\text{g/m}^3 \cdot \text{h}$).
* **Three Output Dimensions Never Collapsed:** Recommendations must maintain the three separate pillars: Personal Protection, Environmental Contribution, and Practicality.
* **Server-Only Secrets:** `GEMINI_API_KEY` is accessed strictly inside server-side Route Handlers (`process.env.GEMINI_API_KEY`). Never prefixed with `NEXT_PUBLIC_`.
* **Bounded Turn Counter:** Chat tool execution is strictly capped at a maximum of 2 tool turns.

---

## 3. Directory & File Manifest

```text
src/
├── app/
│   └── api/
│       ├── plan/
│       │   └── route.ts             # POST handler: Pattern A plan synthesis + deterministic fallback
│       └── chat/
│           └── route.ts             # POST handler: Pattern B tool loop + sanitization + fallback
└── lib/
    ├── ai/
    │   ├── gemini.ts                # Server-only @google/genai client & execution patterns
    │   ├── prompts.ts               # Scientific integrity system instructions & bilingual prompts (EN/HI)
    │   ├── tools.ts                 # Request-scoped tool declarations & deterministic execution handlers
    │   ├── fallback.ts              # Deterministic explanation generators for offline/timeout mode
    │   └── index.ts                 # Barrel exports
    └── schemas/
        └── ai.ts                    # Zod schemas for PlanExplanation, ChatRequest, ChatResponse & ActionCards
scripts/
└── verify-ai.ts                     # Visual CLI diagnostic harness testing Pattern A, Pattern B & offline fallback
tests/
└── ai-orchestration.test.ts         # Unit tests verifying prompt formatting, tool dispatch & fallback guarantees
```

---

## 4. AI Schemas (`src/lib/schemas/ai.ts`)

```typescript
import { z } from "zod";
import { HouseholdProfileSchema } from "./household";
import { EnvironmentalContextSchema } from "./air";
import { EvaluatedInterventionSchema, PersonalProtectionResultSchema } from "./simulation";

export const RecommendationCardSchema = z.object({
  interventionId: z.string(),
  recommendationText: z.string(),
  threePillarJustification: z.object({
    protection: z.string(),
    contribution: z.string(),
    practicality: z.string(),
  }),
});

export const PlanExplanationSchema = z.object({
  headline: z.string(),
  executiveSummary: z.string(),
  vulnerableMemberAdvice: z.string(),
  householdRecommendations: z.array(RecommendationCardSchema),
  airQualityObservationSummary: z.string(),
  assumptionsAndCaveats: z.array(z.string()),
});

export const PlanResponseSchema = z.object({
  environmentalContext: EnvironmentalContextSchema,
  baselineHouseholdMean: z.number(),
  baselinePeakVulnerable: z.number(),
  peakVulnerableMemberRole: z.string(),
  evaluatedInterventions: z.array(EvaluatedInterventionSchema),
  explanation: PlanExplanationSchema,
  aiFallback: z.boolean().default(false),
});

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(1000),
});

export const ChatRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  message: z.string().min(1).max(500),
  history: z.array(ChatTurnSchema).default([]),
});

export const ChatActionCardSchema = z.object({
  actionId: z.string(),
  title: z.string(),
  description: z.string(),
  impactSummary: z.string(),
  selectedInterventionIds: z.array(z.string()).optional(),
});

export const ChatResponseSchema = z.object({
  response: z.string(),
  actionCards: z.array(ChatActionCardSchema).default([]),
  toolsUsed: z.array(z.string()).default([]),
  aiFallback: z.boolean().default(false),
});

export type PlanExplanation = z.infer<typeof PlanExplanationSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type ChatTurn = z.infer<typeof ChatTurnSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatActionCard = z.infer<typeof ChatActionCardSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
```

---

## 5. Pattern A: Dashboard Plan Synthesis (`POST /api/plan`)

### 5.1 Route Execution Flow

1. Parse request body `{ profile: HouseholdProfile }` with Zod.
2. Fetch `EnvironmentalContext` (via cache/adapters).
3. Compute `HouseholdExposureResult` deterministically via `calculateHouseholdExposure`.
4. Filter and evaluate applicable interventions via `isInterventionApplicable` and `evaluateIntervention`.
5. Check `process.env.GEMINI_API_KEY`:
   * If key is absent, call `generateDeterministicPlanExplanation(...)` and return with `aiFallback: true`.
   * If key is present, format pre-computed metrics into system/user prompts and call `GoogleGenAI` with an 8-second timeout:
     ```typescript
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: promptText,
       config: {
         systemInstruction: getSystemInstruction(profile.constraints.preferredLanguage),
         responseMimeType: "application/json",
         responseSchema: PlanExplanationJsonSchema,
         temperature: 0.2,
       },
     });
     ```
   * Parse returned text with `PlanExplanationSchema.safeParse`.
   * If parsing fails or call times out, smoothly fallback to `generateDeterministicPlanExplanation(...)` with `aiFallback: true`.

---

## 6. Pattern B: Interactive What-If Assistant (`POST /api/chat`)

### 6.1 Request-Scoped Tools (`src/lib/ai/tools.ts`)

Inside `POST /api/chat`, tool handlers are constructed as closures over the validated `{ profile, environmentalContext }`:

1. **`get_household_exposure_breakdown`:**
   * Parameters: `{ memberId?: string }`
   * Logic: Returns per-member exposure totals, top contributing activity, and split between indoor rest and outdoor transit exposure.
2. **`simulate_custom_routine`:**
   * Parameters: `{ selectedInterventionIds: string[], activityTimeOverrides?: Array<{ activityId: string, newStartTime: string, newEndTime: string }> }`
   * Logic: Invokes deterministic `simulateRoutine()`, returning the 3-pillar metrics.
3. **`get_cleanest_outdoor_windows`:**
   * Parameters: `{ durationHours: number }`
   * Logic: Scans the 24h hourly forecast array via `findLowestPmWindow()` to return start/end times and average concentration of the cleanest window.

### 6.2 Tool Loop & Turn Termination

* Capped at **2 turns maximum**:
  1. Turn 1: Send user prompt + tool declarations.
  2. If Gemini emits `functionCall`, execute tool closure in TypeScript and send `functionResponse` back.
  3. Turn 2: Gemini produces final conversational text and action cards.
* If Gemini requests an invalid tool or exceeds 2 turns, break and synthesize final response immediately.

---

## 7. Deterministic Fallbacks & Bilingual Prompts (`src/lib/ai/prompts.ts`, `src/lib/ai/fallback.ts`)

### 7.1 Bilingual System Instructions

* **English (`en`):** Enforces professional environmental decision-support terminology, explicit three-pillar demarcation, and exposure proxy framing.
* **Hindi (`hi`):** Enforces natural conversational Devanagari Hindi using culturally resonant terminology (*गंभीर स्मॉग*, *धुआं*, *अगरबत्ती*, *मच्छर कॉइल*, *किचन एग्जॉस्ट*, *दोपहिया वाहन*, *मेट्रो यात्रा*).

### 7.2 Deterministic Template Generator (`fallback.ts`)

Generates complete, publication-grade explanations without external API calls:
```typescript
export function generateDeterministicPlanExplanation(
  profile: HouseholdProfile,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  context: EnvironmentalContext,
  language: "en" | "hi"
): PlanExplanation;
```

---

## 8. Testing & Diagnostic Verification

### 8.1 Visual AI CLI Harness (`scripts/verify-ai.ts`)

Executable via `npm run verify:ai`. Validates:
1. Pattern A plan generation in English and Hindi.
2. Pattern B tool loop execution for schedule shift query.
3. Offline resiliency with `GEMINI_API_KEY=null`.
4. Asserts 100% schema compliance and zero LLM arithmetic hallucination.

### 8.2 Vitest Test Suite (`tests/ai-orchestration.test.ts`)

* Tool handlers produce verified numbers against baseline profiles.
* Input sanitization clips to 500 chars and strips control characters.
* Fallback generator produces valid `PlanExplanation` objects matching Zod schema in both EN and HI.
* Turn counter terminates at $\le 2$ turns.

### 8.3 Exact Verification Commands

```bash
npm run verify:ai
npx vitest run tests/ai-orchestration.test.ts
npx tsc --noEmit
```
