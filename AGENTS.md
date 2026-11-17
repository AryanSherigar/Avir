# AGENTS.md — Avir Engineering & Agent Governance

## 1. Mission & Architectural Authority
You are building **Avir (Smart Air Adaptation and Navigation System)**, a hybrid deterministic and GenAI household winter smog decision-support system governed by `docs/RFC.md`.

- **Primary Vertical:** Budget-conscious multigenerational urban Indian households (Delhi NCR default).
- **Three Non-Negotiable Output Pillars (Never Combine into One Score):**
  1. **Personal Protection:** Estimated $\text{PM}_{2.5}$ exposure proxy reduction ($\Delta E_{\text{proxy}}$) per member and for the peak vulnerable member.
  2. **Environmental Contribution:** Avoided household emissions (e.g., private vehicle km avoided, indoor solid-fuel/incense combustion eliminated).
  3. **Practicality:** Financial cost (INR), daily time impact (minutes/day), and routine inconvenience.

---

## 2. Execution Workflow & Plan-First Gate
1. **Plan First (Mandatory Gate):** Before creating or modifying any files for a new task or milestone, inspect the existing repository and output a concise execution plan listing:
   - Target files to create or update
   - Service boundary compliance check
   - Exact verification commands to be run upon completion
   Wait for user confirmation on the plan before writing implementation code unless explicitly instructed to proceed immediately.
2. **Incremental Delivery:** Implement one logical module or vertical slice at a time. Never attempt to scaffold the entire application in one monolithic pass.

---

## 3. Clean Code Directives (Practical Enforcement)
High **Code Quality** is a primary evaluation metric. Enforce these rules across all TypeScript and React files:
- **Strict Type Safety:** TypeScript `strict: true`. Zero `any`, zero `@ts-ignore`, and zero unvalidated external JSON casts. Validate all external API and LLM payloads at runtime with **Zod**.
- **Small, Focused Functions:** Keep functions under **40 lines** with a single clear responsibility. Extract helper functions rather than nesting loops or conditionals.
- **Flat Control Flow:** Prefer early returns and guard clauses over deep `if/else` nesting (maximum 2 levels of indentation inside function bodies).
- **File Size Discipline:** Keep source files focused and under **250 lines**. Split large components or services into cohesive submodules.
- **Self-Documenting Naming:** Use explicit, domain-accurate names (`calculateMemberExposureProxy`, `evaluateInterventionPracticality`).
- **No Unnecessary Comments:** Code must be self-explanatory through clean design and descriptive naming. Avoid redundant, obvious, or narrative comments that restate what the code is doing. Only add concise JSDoc or comments explaining *why* non-obvious domain constants, mathematical formulations, or edge-case workarounds exist.
- **Zero Dead Code:** Never leave commented-out code blocks, unused imports, `console.log` debugging statements, or `TODO` stubs in committed files.

---

## 4. Strict Service Boundaries & Dependency Rules
Enforce unidirectional dependencies across layers. Cross-layer shortcuts are forbidden:

1. **Domain Schemas (`src/lib/schemas/*`):**
   - Pure Zod schemas and inferred TypeScript types. Zero imports from other `src/` folders.
2. **Deterministic Domain Engines (`src/lib/exposure/*`, `src/lib/interventions/*`, `src/lib/simulation/*`):**
   - Must be **100% pure, deterministic TypeScript** operating on validated data and static JSON rules (`data/*.json`).
   - **FORBIDDEN:** Network `fetch` calls, reading `process.env`, importing `@google/genai`, or touching browser APIs (`localStorage`, `window`).
3. **External Adapters (`src/lib/air-quality/*`, `src/lib/ai/*`):**
   - Server-only modules. `GEMINI_API_KEY` and `DATA_GOV_API_KEY` may ONLY be read here via `process.env`.
   - Must never import React or UI components.
4. **API Route Handlers (`src/app/api/*`):**
   - Thin orchestration controllers only: parse/validate request with Zod -> check cache -> invoke domain engines/adapters -> return typed JSON response. Zero inline domain math.
5. **UI Components (`src/components/*`, `src/app/**/page.tsx`):**
   - **FORBIDDEN:** Importing directly from `src/lib/ai/*`, `src/lib/air-quality/*`, or reading `process.env`.
   - UI components communicate with backend logic exclusively via `/api/*` endpoints and share contracts only from `src/lib/schemas/*` and `src/lib/storage/*`.

---

## 5. Scientific & AI Integrity Rules
- **Distinguish Observations from Models:** Never blend CPCB ground-station readings (`source: "cpcb"`) with Open-Meteo model forecasts (`source: "open_meteo"`). Never compute an official Indian NAQI from a single hourly $\text{PM}_{2.5}$ reading.
- **Transparent Uncertainty:** Always present exposure results as proxy bands (`lowEstimate`, `centralEstimate`, `highEstimate` in $\mu\text{g/m}^3 \cdot \text{h}$) with explicit assumptions. Never claim clinical dose or medical diagnosis.
- **Honest Environmental Accounting:** Report avoided private vehicle travel in `privateVehicleKmAvoidedPerDay`. Never invent tailpipe gram emission factors.
- **LLM Guardrails:** Gemini (`gemini-2.5-flash` via `@google/genai`) must never perform exposure or impact arithmetic. All numbers must originate from the deterministic engines. Always provide a deterministic fallback response if the Gemini API fails or times out.
- **Bilingual Support:** Support both English (`en`) and Hindi (`hi`) driven by `profile.constraints.preferredLanguage`.

---

## 6. Verification & Tooling Protocol (Before Every Commit)
You must verify your work using real tools before committing any change. Do **not** bloat `package.json` with heavy browser binaries—invoke Playwright via `npx playwright`.

Run the applicable checks for every change:
1. **Type & Lint Verification:**
   ```bash
   npx tsc --noEmit
   npm run lint
