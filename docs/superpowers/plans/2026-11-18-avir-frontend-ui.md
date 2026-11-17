# Avir Frontend UI & Local-First State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the responsive Next.js 15 App Router user interface and local-first client state (Spec 5) for Avir, delivering four cohesive screens (Dashboard `/`, Household Setup `/onboarding`, Routine Simulator `/simulator`, and AI Assistant `/assistant`), a Delhi multigenerational household preset, bilingual support (English/Hindi), non-color dependent accessibility, and zero-binary media discipline keeping the repository under 10 MB.

**Architecture:** Client-side React 19 components with Tailwind CSS and `lucide-react` SVG icons. Governed by strict unidirectional service boundaries: UI components communicate strictly via typed JSON API endpoints (`/api/air`, `/api/plan`, `/api/simulate`, `/api/chat`) and domain contracts (`src/lib/schemas/*`). Direct imports from `src/lib/ai/*` or `src/lib/air-quality/*`, as well as reading `process.env`, are strictly forbidden in UI components. Client state is managed locally via browser `localStorage` (`avir_household_profile_v1`) with cross-view synchronization.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5.7+ (strict mode), Tailwind CSS 3.4+, Lucide React 0.475+, Zod 3.24+, Vitest 3.0+.

**Spec:** [docs/superpowers/specs/2026-11-17-avir-frontend-ui-design.md](file:///data/avir/docs/superpowers/specs/2026-11-17-avir-frontend-ui-design.md)

---

## Global Constraints & Directives

* **Strict UI Boundaries (`src/components/*`, `src/app/**/page.tsx`):**
  * Absolutely **FORBIDDEN** from importing `process.env`, `@google/genai`, or external API adapters (`src/lib/air-quality/*`, `src/lib/ai/*`).
  * All server communication occurs strictly through typed JSON endpoints (`/api/air`, `/api/plan`, `/api/simulate`, `/api/chat`).
* **Repository Size Discipline (< 10 MB):**
  * Zero committed PNG/JPG/WebP binaries or `.woff2` font bundles in `public/`.
  * All iconography is rendered via lightweight SVG components from `lucide-react`.
* **Honest Scientific Presentation:**
  * Ground station observations (`source: "cpcb"`) and gridded forecasts (`source: "open_meteo"`) must be visually presented on distinct cards and never merged into a single score.
  * Prominent banner displayed whenever `isDemoFallback: true` or `aiFallback: true` is returned.
  * Three pillars (Personal Protection, Environmental Contribution, Practicality) must remain visually distinct.
* **Bilingual Support (`en` / `hi`):**
  * Support English and Hindi across navigation, status badges, intervention titles, cards, and AI explanations.
* **Clean Code Directives:**
  * TypeScript `strict: true`. Zero `any` and zero `@ts-ignore`.
  * Functions under 40 lines. Max nesting 2 levels. Files under 250 lines.
* **Atomic Commits:**
  * Commit regularly with conventional commit messages (`feat:`, `fix:`, `test:`, `chore:`) after each task passes verification.

---

### Task 1: Tailwind CSS & Styling Infrastructure Setup

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/globals.css`

- [ ] **Step 1: Create Tailwind and PostCSS configuration files**
- [ ] **Step 2: Create `src/app/globals.css` with Tailwind base, components, and utilities**
- [ ] **Step 3: Verify TypeScript compilation**

---

### Task 2: Local-First Storage & React State Hook (`src/lib/storage/*`)

**Files:**
- Create: `src/lib/storage/profile-store.ts`
- Create: `src/lib/storage/use-household.ts`
- Create: `src/lib/storage/index.ts`
- Create: `tests/frontend-contracts.test.ts`

- [ ] **Step 1: Write failing frontend contract tests for default profile and storage sync**
- [ ] **Step 2: Implement `src/lib/storage/profile-store.ts` with `DEFAULT_DELHI_PROFILE` and safe `localStorage` read/write**
- [ ] **Step 3: Implement `src/lib/storage/use-household.ts` React hook**
- [ ] **Step 4: Verify with Vitest and typecheck**

---

### Task 3: Shared Accessible UI Components (`src/components/common/*`)

**Files:**
- Create: `src/components/common/StatusBadge.tsx`
- Create: `src/components/common/PillarCard.tsx`
- Create: `src/components/common/FallbackBanner.tsx`
- Create: `src/components/common/Navbar.tsx`

- [ ] **Step 1: Implement `StatusBadge.tsx` with non-color-dependent icons and bilingual labels**
- [ ] **Step 2: Implement `PillarCard.tsx` for 3 distinct pillars**
- [ ] **Step 3: Implement `FallbackBanner.tsx` for demo data / AI fallback notifications**
- [ ] **Step 4: Implement `Navbar.tsx` with active route indicators and EN/HI toggle**
- [ ] **Step 5: Verify component type safety with `npx tsc --noEmit`**

---

### Task 4: Screen 1: Household Intelligence Setup (`/onboarding`)

**Files:**
- Create: `src/components/household/MemberForm.tsx`
- Create: `src/components/household/ActivityTimeline.tsx`
- Create: `src/components/household/HomeEnvironmentForm.tsx`
- Create: `src/components/household/ConstraintsForm.tsx`
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Implement `MemberForm.tsx` for managing household members**
- [ ] **Step 2: Implement `ActivityTimeline.tsx` with non-negotiable activity padlock locks**
- [ ] **Step 3: Implement `HomeEnvironmentForm.tsx` for ventilation and cooking fuel**
- [ ] **Step 4: Implement `ConstraintsForm.tsx` for budget, extra time, and language**
- [ ] **Step 5: Implement `src/app/onboarding/page.tsx` page orchestrator**
- [ ] **Step 6: Verify with `npx tsc --noEmit`**

---

### Task 5: Screen 2: Air Intelligence & Exposure Dashboard (`/`)

**Files:**
- Create: `src/components/dashboard/AirObservationCard.tsx`
- Create: `src/components/dashboard/HourlyDiurnalChart.tsx`
- Create: `src/components/dashboard/MemberExposureGrid.tsx`
- Create: `src/components/dashboard/PlanSynthesisCard.tsx`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Implement `AirObservationCard.tsx` with strict CPCB vs Open-Meteo separation**
- [ ] **Step 2: Implement `HourlyDiurnalChart.tsx` rendering SVG diurnal curve with inversion peak & dispersion trough**
- [ ] **Step 3: Implement `MemberExposureGrid.tsx` displaying proxy bands and Peak Vulnerable highlight**
- [ ] **Step 4: Implement `PlanSynthesisCard.tsx` displaying Pattern A structured plan**
- [ ] **Step 5: Implement `src/app/layout.tsx` and `src/app/page.tsx`**
- [ ] **Step 6: Verify with `npx tsc --noEmit` and `npm run build`**

---

### Task 6: Screen 3: Counterfactual Routine Simulator (`/simulator`)

**Files:**
- Create: `src/components/simulator/InterventionSelector.tsx`
- Create: `src/components/simulator/ActivitySliderList.tsx`
- Create: `src/components/simulator/SimulationDeltaView.tsx`
- Create: `src/app/simulator/page.tsx`

- [ ] **Step 1: Implement `InterventionSelector.tsx` with category grouping and bilingual labels**
- [ ] **Step 2: Implement `ActivitySliderList.tsx` with disabled locks on non-negotiable activities**
- [ ] **Step 3: Implement `SimulationDeltaView.tsx` comparing baseline vs simulated 3 pillars**
- [ ] **Step 4: Implement `src/app/simulator/page.tsx` with zero-token live execution to `POST /api/simulate`**
- [ ] **Step 5: Verify with `npx tsc --noEmit` and `npm run build`**

---

### Task 7: Screen 4: Bilingual SAANS AI Assistant (`/assistant`)

**Files:**
- Create: `src/components/assistant/ToolExecutionBadge.tsx`
- Create: `src/components/assistant/ActionCardView.tsx`
- Create: `src/components/assistant/ChatMessageList.tsx`
- Create: `src/app/assistant/page.tsx`

- [ ] **Step 1: Implement `ToolExecutionBadge.tsx` displaying deterministic tool execution turns**
- [ ] **Step 2: Implement `ActionCardView.tsx` with 1-click "Apply to Simulator" action**
- [ ] **Step 3: Implement `ChatMessageList.tsx` rendering multi-turn dialogue with quick-prompt chips**
- [ ] **Step 4: Implement `src/app/assistant/page.tsx` integrating with `POST /api/chat`**
- [ ] **Step 5: Verify with `npx tsc --noEmit` and `npm run build`**

---

### Task 8: Verification & Size Audit

**Files:**
- Create: `scripts/verify-frontend.ts`

- [ ] **Step 1: Create `scripts/verify-frontend.ts` CLI diagnostic harness**
- [ ] **Step 2: Run complete verification suite (`npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build`, `scripts/verify-frontend.ts`)**
- [ ] **Step 3: Audit total repository disk usage (`du -sh .`) to ensure < 10 MB**
