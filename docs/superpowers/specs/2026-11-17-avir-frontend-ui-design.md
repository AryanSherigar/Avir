# Specification 5: Avir Frontend UI & Local-First State

| Metadata | Details |
| --- | --- |
| **Document ID** | SPEC-AVIR-005 |
| **Title** | Responsive Next.js App Router UI, Local-First State, 4 Screens & Bilingual Accessibility |
| **System** | Avir (Smart Air Adaptation and Navigation System) |
| **Status** | Approved Design / Ready for Implementation Plan |
| **Author** | Antigravity AI Assistant & Engineering Team |
| **Date** | 2026-11-17 |

---

## 1. Executive Summary

This specification defines the user interface and client-side architecture for **Avir**. Built on Next.js 15 App Router, React 19, Tailwind CSS, and `lucide-react`, it delivers an accessible, high-performance web experience tailored for budget-conscious multigenerational urban Indian households.

Spec 5 establishes:
1. **Local-First Privacy & Zero-Friction Launch:** Household profiles persist in browser `localStorage` (`avir_household_profile_v1`). A realistic Delhi multigenerational preset family is pre-loaded by default, ensuring evaluators and residents see a fully active, live dashboard immediately on launch without tedious initial form entry.
2. **Four Cohesive Screens:**
   * **Dashboard (`/`):** Source-separated AQI cards, 24-hour diurnal exposure timeline, member exposure bars, and AI synthesis.
   * **Household Setup (`/onboarding`):** Multigenerational member roster, 24-hour activity builder with non-negotiable locks, housing ventilation, cooking fuel, and budget constraints.
   * **Routine Simulator (`/simulator`):** Real-time interactive counterfactual simulator with zero-token toggles and sliders, displaying the three strictly separate pillars.
   * **Bilingual Assistant (`/assistant`):** Multi-turn what-if chat with tool execution badges and actionable recommendations.
3. **Inclusive & Accessible UX:** Full English and Hindi support (`en` / `hi`), non-color dependent status indicators, semantic HTML landmarks, and zero binary media bloat (keeping the repository strictly under 10 MB).

---

## 2. Architectural Boundaries & Non-Negotiable Directives

In accordance with `AGENTS.md` and `RFC.md`:

* **UI Layer Boundary (`src/components/*`, `src/app/**/page.tsx`):**
  * Absolutely **FORBIDDEN** from importing `process.env`, `@google/genai`, or external API adapters (`src/lib/air-quality/*`, `src/lib/ai/*`).
  * All server communication occurs strictly through typed JSON endpoints (`/api/air`, `/api/plan`, `/api/simulate`, `/api/chat`).
* **Repository Size Discipline (< 10 MB):**
  * Zero committed PNG/JPG/WebP binaries or `.woff2` font bundles in `public/`.
  * All iconography is rendered via lightweight SVG components from `lucide-react`.
  * Typography utilizes Google Fonts via `next/font/google`.
* **Honest Scientific Presentation:**
  * Ground station observations (`source: "cpcb"`) and gridded forecasts (`source: "open_meteo"`) must be visually presented on distinct cards and never merged into a single score.
  * Prominent banner displayed whenever `isDemoFallback: true` or `aiFallback: true` is returned.
  * Three pillars (Personal Protection, Environmental Contribution, Practicality) must remain visually distinct.

---

## 3. Directory & File Manifest

```text
src/
├── app/
│   ├── layout.tsx                   # Accessible root shell, navigation bar, language toggle, and fallback banner
│   ├── page.tsx                     # Screen 2: Air Intelligence & Exposure Dashboard
│   ├── onboarding/
│   │   └── page.tsx                 # Screen 1: Household Intelligence Setup
│   ├── simulator/
│   │   └── page.tsx                 # Screen 3: Counterfactual Routine Simulator
│   ├── assistant/
│   │   └── page.tsx                 # Screen 4: Bilingual SAANS AI Assistant
│   └── globals.css                  # Tailwind styles and custom utilities
├── components/
│   ├── common/
│   │   ├── Navbar.tsx               # Top navigation with active route highlights & EN/HI switch
│   │   ├── FallbackBanner.tsx       # Unmissable notification for demo data or deterministic AI mode
│   │   ├── PillarCard.tsx           # Reusable 3-pillar display card (Protection, Contribution, Practicality)
│   │   └── StatusBadge.tsx          # Dual text + icon + color badge (Severe, Very Poor, Moderate, etc.)
│   ├── dashboard/
│   │   ├── AirObservationCard.tsx   # CPCB station details, freshness timestamp, and official NAQI
│   │   ├── HourlyDiurnalChart.tsx   # 24-hour ambient PM2.5 and wind dispersion SVG/HTML curve
│   │   ├── MemberExposureGrid.tsx   # Per-member exposure bars highlighting Peak Vulnerable member
│   │   └── PlanSynthesisCard.tsx    # Pattern A Gemini explanation card with bilingual support
│   ├── household/
│   │   ├── MemberForm.tsx           # Add/edit member (role, category, sensitivity)
│   │   ├── ActivityTimeline.tsx     # Add/edit 24h routine spans with non-negotiable lock toggles
│   │   ├── HomeEnvironmentForm.tsx  # Ventilation, cooking fuel, exhaust hood, purifier, incense
│   │   └── ConstraintsForm.tsx      # Daily INR budget, extra time cap, and language selection
│   ├── simulator/
│   │   ├── InterventionSelector.tsx # Checkbox list of eligible interventions grouped by category
│   │   ├── ActivitySliderList.tsx   # Shift start/end times with immediate live simulation feedback
│   │   └── SimulationDeltaView.tsx  # Side-by-side baseline vs counterfactual 3-pillar comparison
│   └── assistant/
│       ├── ChatMessageList.tsx      # Chat dialogue turns with role styling
│       ├── ToolExecutionBadge.tsx   # Shows request-scoped function calling steps (e.g. simulate_routine)
│       └── ActionCardView.tsx       # Actionable suggestion cards with "Apply to Simulator" button
└── lib/
    └── storage/
        ├── profile-store.ts         # LocalStorage read/write with Delhi multigenerational preset
        └── use-household.ts         # React hook for synchronized state across all 4 screens
tests/
└── frontend-contracts.test.ts       # Verifies local storage persistence and component contract types
```

---

## 4. Local-First Storage & Default Delhi Preset (`src/lib/storage/profile-store.ts`)

### 4.1 Default Preset Family

To ensure the evaluator sees a fully functional system on the first click without manual onboarding, `profile-store.ts` initializes with this default:

```typescript
export const DEFAULT_DELHI_PROFILE: HouseholdProfile = {
  location: {
    city: "Delhi",
    areaLabel: "Anand Vihar",
    latitude: 28.6139,
    longitude: 77.209,
  },
  members: [
    { id: "m-child", roleLabel: "Aarav (School Child)", category: "child", outdoorSensitivity: "higher" },
    { id: "m-commuter", roleLabel: "Vikram (Commuting Parent)", category: "adult", outdoorSensitivity: "standard" },
    { id: "m-senior", roleLabel: "Kamla Devi (Grandmother)", category: "older_adult", outdoorSensitivity: "higher" },
  ],
  activities: [
    {
      id: "act-sleep",
      memberId: "m-child",
      type: "indoor_rest",
      startTime: "21:30",
      endTime: "06:30",
      indoor: true,
    },
    {
      id: "act-school",
      memberId: "m-child",
      type: "school",
      startTime: "07:30",
      endTime: "14:00",
      indoor: true,
    },
    {
      id: "act-commute-morning",
      memberId: "m-commuter",
      type: "work",
      startTime: "08:15",
      endTime: "09:15",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
      originLabel: "Anand Vihar",
      destinationLabel: "Connaught Place",
    },
    {
      id: "act-commute-evening",
      memberId: "m-commuter",
      type: "work",
      startTime: "18:00",
      endTime: "19:00",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
      originLabel: "Connaught Place",
      destinationLabel: "Anand Vihar",
    },
    {
      id: "act-cooking-lunch",
      memberId: "m-senior",
      type: "cooking",
      startTime: "11:30",
      endTime: "13:00",
      indoor: true,
    },
    {
      id: "act-cooking-dinner",
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
    dailyBudgetInr: 250,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: ["act-school"],
  },
};
```

### 4.2 Storage Synchronization

* Read: On initial client mount, checks `localStorage.getItem("avir_household_profile_v1")`. If absent or invalid, initializes with `DEFAULT_DELHI_PROFILE`.
* Write: Updates emit a browser window `storage` event, ensuring all tabs and views remain strictly in sync.

---

## 5. Four Screen Specifications

### 5.1 Screen 1: Household Setup (`/onboarding`)

* **Member Roster:** Interactive table/cards displaying household members. Users can add members with role labels ("Grandparent", "Infant"), select categories (`child`, `adult`, `older_adult`), and set sensitivity (`standard`, `higher`).
* **24-Hour Routine Timeline:**
  * Chronological list of activities per member.
  * Inputs: Type (`school`, `work`, `cooking`, `exercise`, etc.), Start Time (`HH:MM`), End Time (`HH:MM`), Indoor/Outdoor toggle, Transport Mode, and Commute Distance.
  * **Non-Negotiable Lock Toggle:** A prominent padlock icon next to each activity. When locked, the activity's `id` is added to `constraints.nonNegotiableActivityIds`, signaling to the simulation engine and Gemini that this activity must never be shifted.
* **Home Environment:** Radio buttons and toggles for ventilation (`low`, `moderate`, `good`), cooking fuel (`lpg`, `electric_induction`, `solid_fuel`), exhaust fan, HEPA air purifier, and evening incense.
* **Constraints:** Sliders for `dailyBudgetInr` (₹0 to ₹2,000) and `maxExtraTimeMinutesPerDay` (0 to 120 mins).
* **Save & Explore:** Saves to `localStorage` and navigates directly to the Dashboard.

### 5.2 Screen 2: Air Intelligence & Exposure Dashboard (`/`)

* **Source-Separated Environmental Header:**
  * **Card 1: Ground Station (CPCB):** Shows station name, distance in km, observation timestamp, live $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, and official NAQI badge.
  * **Card 2: Gridded Forecast (Open-Meteo):** Shows 24-hour forecast horizon and meteorological dispersion indicators (wind speed, temperature).
* **24-Hour Diurnal Ambient Curve:** Visual chart rendering the 24 hourly $\text{PM}_{2.5}$ forecast points, highlighting the morning inversion peak (06:00–09:00) and afternoon dispersion trough (13:00–16:00).
* **Household Member Exposure Grid:**
  * Visual progress bars for each member displaying estimated $E_{\text{proxy}, m}$ in $\mu\text{g/m}^3 \cdot \text{h}$ with uncertainty range $[ \text{low}, \text{high} ]$.
  * **Peak Vulnerable Member Highlight:** Distinct badge and protective callout for the most vulnerable individual.
* **AI Plan Synthesis Card:**
  * Displays the Pattern A structured explanation generated by `/api/plan`.
  * Shows Executive Summary, Peak Vulnerable Guidance, and Actionable Intervention Cards with 3-pillar tags.
  * Includes a "Test in Simulator" button linking to `/simulator`.

### 5.3 Screen 3: Counterfactual Routine Simulator (`/simulator`)

* **Zero-Token Live Execution:** Toggling interventions or moving sliders fires `POST /api/simulate` (pure TypeScript execution in < 15 ms).
* **Intervention Catalogue Toggles:** Checkbox list of eligible interventions from `data/interventions.json` with bilingual titles, estimated costs, and time impacts.
* **Activity Time-Shift Controls:** Sliders allowing users to adjust flexible activity times (locked activities display a disabled padlock).
* **Three Strictly Separate Pillars Output:**
  * **Pillar 1 (Personal Protection):**
    * Baseline vs Projected Peak Vulnerable Exposure.
    * Exact $\Delta E_{\text{proxy}}$ avoided.
    * Relative percentage reduction badge.
  * **Pillar 2 (Environmental Contribution):**
    * Private vehicle kilometers avoided per day (`privateVehicleKmAvoidedPerDay`).
    * Indoor combustion elimination status.
  * **Pillar 3 (Practicality):**
    * Total INR cost vs household daily budget cap (Green "Within Budget" or Red "Exceeds Budget" status).
    * Total extra time minutes vs household time cap.
    * Inconvenience rating badge (`low`, `medium`, `high`).
    * Google Maps Transit directions deep link (when transit substitution is active).

### 5.4 Screen 4: Bilingual AI Assistant (`/assistant`)

* **Interactive What-If Chat Interface:**
  * Chat history container displaying user and model message turns.
  * Quick-prompt chips: *"What is our biggest exposure source today?"*, *"Can I shift my morning jog to the afternoon?"*, *"How much do we save switching to Delhi Metro?"*.
* **Tool Execution Badges:** When Gemini executes a function-calling step (`simulate_custom_routine`, `get_cleanest_outdoor_windows`), renders a clean, subtle status badge showing which deterministic tool was consulted.
* **Action Cards:** Rendered alongside Gemini's response with a 1-click "Apply to Routine" button that updates the user's active simulator state.

---

## 6. Accessibility, Bilingual Support & Responsive UX

* **Bilingual Switcher:** Global language toggle in header (`English` / `हिंदी`) toggles `profile.constraints.preferredLanguage`, immediately updating UI text, intervention titles, and AI explanations.
* **Non-Color Dependent Status:** Every air quality rating and risk badge pairs high-contrast color coding with explicit text and Lucide icons:
  * Severe ($> 400$): Crimson background + `AlertTriangle` icon + text label *"Severe Smog / गंभीर स्मॉग"*.
  * Very Poor ($301–400$): Purple background + `Wind` icon + text label *"Very Poor / बहुत खराब"*.
  * Poor ($201–300$): Orange background + `ShieldAlert` icon + text label *"Poor / खराब"*.
  * Moderate ($101–200$): Amber background + `Activity` icon + text label *"Moderate / मध्यम"*.
  * Satisfactory/Good ($\le 100$): Emerald background + `CheckCircle` icon + text label *"Moderate/Good / संतोषजनक"*.
* **Semantic HTML Landmarks:** `<header>`, `<main>`, `<nav>`, `<aside>`, `<section>`, with `aria-live="polite"` on simulation delta recalculations.

---

## 7. Testing & Verification

### 7.1 Vitest Frontend Contract Tests (`tests/frontend-contracts.test.ts`)

* Verifies `DEFAULT_DELHI_PROFILE` strictly satisfies `HouseholdProfileSchema`.
* Verifies `profile-store.ts` handles browser environments where `localStorage` is empty or malformed.
* Verifies bilingual string resolution across all static intervention entries.

### 7.2 Type & Production Build Verification

```bash
# 1. Verify strict TypeScript across all React components:
npx tsc --noEmit

# 2. Run unit tests:
npm run test

# 3. Verify Next.js production build:
npm run build

# 4. Verify repository size is under 10 MB:
du -sh .
```
