# Specification 3: Avir Air Intelligence & Adapters

| Metadata | Details |
| --- | --- |
| **Document ID** | SPEC-AVIR-003 |
| **Title** | Multi-Source Air Quality Ingestion, CPCB Multi-Row Aggregation, Anomaly Validation & Caching |
| **System** | Avir (Smart Air Adaptation and Navigation System) |
| **Status** | Approved Design / Ready for Implementation Plan |
| **Author** | Antigravity AI Assistant & Engineering Team |
| **Date** | 2026-11-17 |

---

## 1. Executive Summary

This specification establishes the external environmental data ingestion pipeline for **Avir**. It integrates official Indian ground-station observations from the Central Pollution Control Board (CPCB via `data.gov.in`) with numerical gridded forecasts from Open-Meteo, while enforcing strict scientific demarcation: empirical sensor readings and numerical model predictions are returned as distinct fields and **never blended**.

Spec 3 provides:
1. Multi-row CPCB aggregation grouping individual pollutant rows (`PM2.5`, `PM10`, `NO2`) by station and matching the closest station via Haversine great-circle distance.
2. A keyless Open-Meteo adapter extracting 24-hour hourly `pm2_5`, `pm10`, and wind speed curves.
3. Anomaly filters rejecting unphysical readings ($\text{PM}_{2.5} \le 0$, $\text{PM}_{2.5} > 1500$, or $\text{PM}_{2.5} > 1.25 \times \text{PM}_{10}$) and scoring observation confidence based on telemetry freshness.
4. A bounded in-memory LRU cache (15-min TTL, $0.05^\circ$ coordinate rounding, max 100 entries).
5. A cascading fallback architecture that seamlessly degrades from CPCB ground observation to Open-Meteo current model point to curated offline demo snapshot (`data/demo-air-quality.json`) with prominent UI flags (`isDemoFallback: true`).
6. The `GET /api/air` Route Handler and a formatted visual CLI diagnostic harness (`scripts/verify-air.ts`).

---

## 2. Scientific & Architectural Enforcements

In accordance with `AGENTS.md` and `RFC.md`:

* **Never Blend Observations with Forecasts:** `currentObservation` (from CPCB or demo fallback) and `hourlyForecast` (from Open-Meteo) must remain separate. No combined "composite AQI" or averaged index may be produced.
* **No Single-Hour NAQI Fabrication:** The official Indian National Air Quality Index (NAQI) requires multi-pollutant 24-hour/8-hour averaging. Avir will only expose `officialNaqi` if provided directly by CPCB; otherwise it remains `null`.
* **Server-Only Secrets:** `DATA_GOV_API_KEY` is read strictly inside server Route Handlers (`process.env.DATA_GOV_API_KEY`). It must never be prefixed with `NEXT_PUBLIC_` or exposed to browser bundles.
* **Strict Runtime Type Safety:** All external HTTP responses from `data.gov.in` and Open-Meteo must be validated at runtime via Zod before consumption.

---

## 3. Directory & File Manifest

```text
src/
├── app/
│   └── api/
│       └── air/
│           └── route.ts             # GET handler: validates query params, checks cache, returns EnvironmentalContext
└── lib/
    └── air-quality/
        ├── cpcb.ts                  # data.gov.in multi-row parser, station grouper & Haversine distance
        ├── open-meteo.ts            # Keyless Open-Meteo 24h forecast & current model point fetcher
        ├── validation.ts            # Physical anomaly filter & observation freshness confidence scorer
        ├── cache.ts                 # Bounded 15-min TTL LRU cache with spatial grid rounding
        ├── normalize.ts             # Orchestrates cache, parallel fetching, validation & demo fallback
        └── index.ts                 # Barrel exports
scripts/
└── verify-air.ts                    # Formatted visual CLI diagnostic harness testing live/fallback air data
tests/
└── air-quality.test.ts              # Unit tests for multi-row parsing, anomaly rejection, and caching
```

---

## 4. CPCB Multi-Row Aggregation & Haversine Grouper (`src/lib/air-quality/cpcb.ts`)

### 4.1 Upstream Payload Format

The `data.gov.in` CPCB resource (`resource_id: 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69`) returns a flat array of records where each record represents a single pollutant for a single station:

```typescript
export interface CpcbRawRecord {
  country?: string;
  state?: string;
  city?: string;
  station: string;
  last_update?: string; // Format: "DD-MM-YYYY HH:mm:ss"
  pollutant_id: string; // "PM2.5" | "PM10" | "NO2" | "CO" | "OZONE"
  pollutant_min?: string;
  pollutant_max?: string;
  pollutant_avg?: string; // Numeric string or "NA"
  latitude?: string;
  longitude?: string;
}
```

### 4.2 Grouping & Station Selection Algorithm

1. **City Filtering:** Match records where `record.city?.toLowerCase() === queryCity.toLowerCase()`.
2. **Station Grouping:** Group records by `record.station`.
3. **Value Parsing:** For each station, extract:
   * `pm25`: parsed float from row with `pollutant_id === "PM2.5"` (ignoring `"NA"`).
   * `pm10`: parsed float from row with `pollutant_id === "PM10"`.
   * `no2`: parsed float from row with `pollutant_id === "NO2"`.
   * `observedAt`: parsed ISO string from `last_update`.
   * `latitude`, `longitude`: parsed floats.
4. **Candidate Filtering:** Filter to stations having a valid, positive `pm25` value and valid coordinates.
5. **Haversine Distance Matching:**
   For target coordinates $(\phi_1, \lambda_1)$ and station coordinates $(\phi_2, \lambda_2)$:
   $$\Delta \phi = \phi_2 - \phi_1, \quad \Delta \lambda = \lambda_2 - \lambda_1$$
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$d = 2R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a}) \quad (R = 6371\text{ km})$$
6. **Area Label Boost:** If `areaLabel` is specified (e.g., "Anand Vihar"), prioritize stations whose names contain `areaLabel` (case-insensitive substring match).
7. Select the nearest valid station and return `CurrentObservation` with `source: "cpcb"`.

---

## 5. Open-Meteo Ingestion & Physical Validation

### 5.1 Open-Meteo Ingestion (`src/lib/air-quality/open-meteo.ts`)

* **Air Quality API:** `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10&forecast_days=2&timezone=auto`
* **Weather API:** `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m&forecast_days=2&timezone=auto`
* **Output Processing:**
  * Aligns timestamps to the current 24-hour day horizon ($00:00$ to $23:00$).
  * Produces an array of exactly 24 `HourlyForecastPoint` objects.
  * If CPCB is unavailable, extracts hour 0 point as `source: "open_meteo_current"` with `confidence: "medium"`.

### 5.2 Anomaly & Freshness Validation (`src/lib/air-quality/validation.ts`)

```typescript
export function validateObservation(obs: {
  pm25: number | null;
  pm10: number | null;
  observedAt: string;
}): { isValid: boolean; confidence: "high" | "medium" | "low"; warnings: string[] } {
  const warnings: string[] = [];

  if (obs.pm25 === null || obs.pm25 <= 0) {
    return { isValid: false, confidence: "low", warnings: ["Invalid non-positive PM2.5 reading"] };
  }

  if (obs.pm25 > 1500) {
    return { isValid: false, confidence: "low", warnings: ["PM2.5 exceeds physical threshold of 1500 µg/m³"] };
  }

  if (obs.pm10 !== null && obs.pm10 > 0 && obs.pm25 > obs.pm10 * 1.25) {
    return {
      isValid: false,
      confidence: "low",
      warnings: ["PM2.5 exceeds PM10 by more than 25% tolerance (sensor anomaly)"],
    };
  }

  const ageMs = Date.now() - new Date(obs.observedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  let confidence: "high" | "medium" | "low" = "high";
  if (ageHours > 3) {
    confidence = "low";
    warnings.push("Station reading is older than 3 hours");
  } else if (ageHours > 1) {
    confidence = "medium";
  }

  return { isValid: true, confidence, warnings };
}
```

---

## 6. Bounded In-Memory LRU Cache (`src/lib/air-quality/cache.ts`)

* **Spatial Key:** `${city.toLowerCase()}_${Math.round(lat * 20) / 20}_${Math.round(lon * 20) / 20}` ($0.05^\circ \approx 5.5\text{ km}$ grid resolution).
* **TTL:** 15 minutes ($900,000\text{ ms}$).
* **Capacity Limit:** Maximum 100 entries. Oldest entries are evicted via standard JavaScript `Map` iteration order on insertion.

---

## 7. Cascading Fallback & Route Handler (`src/app/api/air/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnvironmentalContext } from "@/lib/air-quality/normalize";

const AirQuerySchema = z.object({
  city: z.string().min(2).max(60).default("Delhi"),
  lat: z.coerce.number().min(-90).max(90).default(28.6139),
  lon: z.coerce.number().min(-180).max(180).default(77.209),
  areaLabel: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = AirQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.issues }, { status: 400 });
    }

    const { city, lat, lon, areaLabel } = parsed.data;
    const context = await getEnvironmentalContext(city, lat, lon, areaLabel);

    return NextResponse.json(context, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load air quality data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## 8. Testing & Diagnostic Verification

### 8.1 Visual Air Diagnostic Harness (`scripts/verify-air.ts`)

Executable via `npm run verify:air`. Validates:
1. Queries Delhi coordinates (`28.6139, 77.2090`).
2. Prints formatted terminal tables for observation metadata, hourly forecast curve, and cache hit timing.
3. Tests resilience by mocking CPCB failure and asserting Open-Meteo fallback; mocks Open-Meteo failure and asserts `data/demo-air-quality.json` fallback with `isDemoFallback: true`.

### 8.2 Vitest Test Suite (`tests/air-quality.test.ts`)

* Multi-row CPCB aggregation from raw JSON fixtures.
* Haversine distance calculations and station selection.
* Physical anomaly rejection ($\text{PM}_{2.5} \le 0$, $> 1500$, $> 1.25 \times \text{PM}_{10}$).
* Freshness degradation and data quality warnings.
* LRU cache expiration after 15 minutes and coordinate grid rounding.

### 8.3 Exact Verification Commands

```bash
npm run verify:air
npx vitest run tests/air-quality.test.ts
npx tsc --noEmit
```
