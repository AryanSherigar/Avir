# Security Audit Findings Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate three confirmed security vulnerabilities from audit `avir-audit-run-1` (unbounded chat history DoS, air cache cross-area pollution, and unbounded household schema array stalling) and implement HTTP security headers in Next.js configuration.

**Architecture:** Enforce defense-in-depth at trust boundaries without violating AGENTS.md service layers. Zod schemas strictly bound input sizes at the API boundary, the Gemini adapter windows conversational context to cap prompt token spend, the air quality cache keys by normalized area label to prevent cross-neighborhood collision, and Next.js emits strict HTTP security headers.

**Tech Stack:** Next.js 15, TypeScript 5 (strict), Zod 3, Vitest 3.

**Spec:** `/home/aryan-sherigar/security-audit-skill/avir/run-1/REPORT.md` and `/home/aryan-sherigar/security-audit-skill/avir/run-1/FINDINGS-DETAIL.md`

## Global Constraints

- **AGENTS.md Layer Boundaries:**
  - `src/lib/schemas/*` must remain pure Zod schemas with zero imports from other `src/` modules.
  - `src/lib/air-quality/*` and `src/lib/ai/*` remain server-only adapters. No domain math inline.
  - Zero `any`, zero `@ts-ignore`, 100% strict TypeScript.
- **Backward Compatibility:** Existing valid profiles, air lookups, and chat requests must continue to work without disruption.

---

### Task 1: Bound Chat API Input Depth & Context Window (`avir-chat-unbounded-history-dos`)

**Files:**
- Modify: `src/lib/schemas/ai.ts`
- Modify: `src/lib/ai/gemini.ts`
- Test: `tests/ai-schemas.test.ts`
- Test: `tests/ai-gemini.test.ts`

**Interfaces:**
- Consumes: `ChatTurnSchema`, `ChatTurn[]`
- Produces: `ChatRequestSchema.shape.history` with `.max(20)`, `buildInitialChatContents` windowed with `history.slice(-10)`

- [x] **Step 1: Write failing tests for chat history bounds**
  Add unit tests in `tests/ai-schemas.test.ts`:
  - Verify that a `ChatRequest` with 20 turns passes validation.
  - Verify that a `ChatRequest` with 21 turns is rejected with a Zod validation error.
  Add unit test in `tests/ai-gemini.test.ts` (or mock test) verifying that `buildInitialChatContents` only takes the last 10 turns when given 15 turns.

- [x] **Step 2: Run tests to confirm failure**
  ```bash
  npx vitest run tests/ai-schemas.test.ts
  ```

- [x] **Step 3: Update `src/lib/schemas/ai.ts`**
  Update `ChatRequestSchema`:
  ```ts
  export const ChatRequestSchema = z.object({
    profile: HouseholdProfileSchema,
    message: z.string().trim().min(1).max(500),
    history: z.array(ChatTurnSchema).max(20).default([]),
  });
  ```

- [x] **Step 4: Update `src/lib/ai/gemini.ts`**
  In `buildInitialChatContents`:
  ```ts
  function buildInitialChatContents(
    history: ChatTurn[],
    userMessage: string
  ): Content[] {
    const windowedHistory = history.slice(-10);
    const contents: Content[] = windowedHistory.map((h) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }],
    }));
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });
    return contents;
  }
  ```

- [x] **Step 5: Run tests and verify they pass**
  ```bash
  npx vitest run tests/ai-schemas.test.ts tests/ai-gemini.test.ts
  ```

- [x] **Step 6: Commit changes**
  ```bash
  git commit -am "fix(security): bound chat history array and prompt context window"
  ```

---

### Task 2: Area-Keyed Air Quality Caching (`avir-air-cache-unkeyed-area`)

**Files:**
- Modify: `src/lib/air-quality/cache.ts`
- Modify: `src/lib/air-quality/normalize.ts`
- Test: `tests/air-quality.test.ts`

**Interfaces:**
- Consumes: `getAirCacheKey(city: string, lat: number, lon: number, areaLabel?: string): string`
- Produces: Normalized area-aware cache keys that prevent cross-neighborhood cache collision.

- [x] **Step 1: Write failing tests for areaLabel cache separation**
  Add unit tests in `tests/air-quality.test.ts`:
  - `getAirCacheKey("Delhi", 28.61, 77.21, "Anand Vihar")` vs `getAirCacheKey("Delhi", 28.61, 77.21, "Mandir Marg")` produce distinct keys.
  - Querying context with `areaLabel: "Anand Vihar"` caches separately from `areaLabel: "Mandir Marg"`.

- [x] **Step 2: Run tests to confirm failure**
  ```bash
  npx vitest run tests/air-quality.test.ts
  ```

- [x] **Step 3: Update `src/lib/air-quality/cache.ts`**
  Update signature and logic:
  ```ts
  export function getAirCacheKey(
    city: string,
    lat: number,
    lon: number,
    areaLabel?: string
  ): string {
    const normCity = city.trim().toLowerCase();
    const roundedLat = Math.round(lat * 20) / 20;
    const roundedLon = Math.round(lon * 20) / 20;
    const normArea = areaLabel
      ? `_${areaLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}`
      : "";
    return `${normCity}_${roundedLat}_${roundedLon}${normArea}`;
  }
  ```

- [x] **Step 4: Update `src/lib/air-quality/normalize.ts`**
  Pass `areaLabel` when generating `cacheKey`:
  ```ts
  const cacheKey = getAirCacheKey(city, lat, lon, areaLabel);
  ```

- [x] **Step 5: Run air quality tests and verify they pass**
  ```bash
  npx vitest run tests/air-quality.test.ts tests/api-air.test.ts
  ```

- [x] **Step 6: Commit changes**
  ```bash
  git commit -am "fix(security): prevent air cache collision by keying normalized areaLabel"
  ```

---

### Task 3: Bound Household Profile Collections & Identifiers (`avir-household-schema-unbounded-arrays`)

**Files:**
- Modify: `src/lib/schemas/household.ts`
- Test: `tests/schemas.test.ts`

**Interfaces:**
- Consumes: `HouseholdProfileSchema`
- Produces: Constrained `members` (max 20), `activities` (max 60), `nonNegotiableActivityIds` (max 20), `householdName` (max 100)

- [x] **Step 1: Write failing tests for household array upper bounds**
  Add unit tests in `tests/schemas.test.ts`:
  - Profile with 21 members is rejected by `HouseholdProfileSchema.safeParse`.
  - Profile with 61 activities is rejected by `HouseholdProfileSchema.safeParse`.
  - Profile with 21 non-negotiable activity IDs is rejected.
  - Profile with household name > 100 characters is rejected.
  - Realistic profile with 5 members and 15 activities passes.

- [x] **Step 2: Run tests to confirm failure**
  ```bash
  npx vitest run tests/schemas.test.ts
  ```

- [x] **Step 3: Update `src/lib/schemas/household.ts`**
  Add `.max()` constraints:
  ```ts
  export const ConstraintsSchema = z.object({
    dailyBudgetInr: z.number().min(0),
    maxExtraTimeMinutesPerDay: z.number().min(0),
    preferredLanguage: z.enum(["en", "hi"]).default("en"),
    nonNegotiableActivityIds: z.array(z.string()).max(20).default([]),
  });

  export const HouseholdProfileSchema = z.object({
    householdName: z.string().max(100).optional(),
    location: LocationSchema,
    members: z.array(MemberSchema).min(1).max(20),
    activities: z.array(ActivitySchema).max(60),
    home: HomeEnvironmentSchema,
    constraints: ConstraintsSchema,
  });
  ```

- [x] **Step 4: Run tests and verify they pass**
  ```bash
  npx vitest run tests/schemas.test.ts tests/exposure.test.ts tests/calculate.test.ts
  ```

- [x] **Step 5: Commit changes**
  ```bash
  git commit -am "fix(security): constrain members, activities, and string lengths in HouseholdProfileSchema"
  ```

---

### Task 4: Configure HTTP Security Headers (`avir-deployment-missing-security-headers`)

**Files:**
- Create: `next.config.mjs`
- Test: `tests/security-headers.test.ts`

**Interfaces:**
- Produces: `next.config.mjs` exporting Next.js configuration with `headers()` function returning CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and Permissions-Policy.

- [x] **Step 1: Write test verifying security header configuration**
  Create `tests/security-headers.test.ts` that dynamically imports `next.config.mjs` and verifies that calling `headers()` returns rules covering `source: "/(.*)"` with required security headers:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`

- [x] **Step 2: Run test to confirm failure**
  ```bash
  npx vitest run tests/security-headers.test.ts
  ```

- [x] **Step 3: Create `next.config.mjs`**
  Implement:
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(self)",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
            {
              key: "Content-Security-Policy",
              value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.open-meteo.com https://api.data.gov.in;",
            },
          ],
        },
      ];
    },
  };

  export default nextConfig;
  ```

- [x] **Step 4: Run tests and verify they pass**
  ```bash
  npx vitest run tests/security-headers.test.ts
  ```

- [x] **Step 5: Commit changes**
  ```bash
  git commit -am "feat(security): configure production HTTP security headers in next.config.mjs"
  ```

---

### Task 5: Full Verification & Integration Verification

- [x] **Step 1: Type check**
  ```bash
  npx tsc --noEmit
  ```
- [x] **Step 2: Run complete test suite**
  ```bash
  npx vitest run
  ```
- [x] **Step 3: Run existing domain verification scripts**
  ```bash
  npm run verify:core
  npm run verify:simulation
  npm run verify:air
  npm run verify:ai
  npm run verify:frontend
  ```
- [x] **Step 4: Next.js build verification**
  ```bash
  npm run build
  ```
