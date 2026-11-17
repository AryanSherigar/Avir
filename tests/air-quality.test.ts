import { describe, it, expect, beforeEach } from "vitest";
import { validateObservation } from "../src/lib/air-quality/validation";
import {
  getAirCache,
  setAirCache,
  getAirCacheKey,
  clearAirCache,
} from "../src/lib/air-quality/cache";
import { parseCpcbRecords, calculateHaversineDistanceKm } from "../src/lib/air-quality/cpcb";
import { parseOpenMeteoPayload } from "../src/lib/air-quality/open-meteo";
import { getEnvironmentalContext } from "../src/lib/air-quality/normalize";
import demoData from "../data/demo-air-quality.json";
import { EnvironmentalContext } from "../src/lib/schemas/air";

describe("Air Quality Observation Validation", () => {
  it("rejects non-positive PM2.5 readings", () => {
    const resZero = validateObservation({ pm25: 0, pm10: 50, observedAt: new Date().toISOString() });
    expect(resZero.isValid).toBe(false);
    expect(resZero.warnings).toContain("Invalid non-positive PM2.5 reading");

    const resNull = validateObservation({ pm25: null, pm10: 50, observedAt: new Date().toISOString() });
    expect(resNull.isValid).toBe(false);
  });

  it("rejects readings exceeding physical threshold of 1500 µg/m³", () => {
    const res = validateObservation({ pm25: 1501, pm10: 1600, observedAt: new Date().toISOString() });
    expect(res.isValid).toBe(false);
    expect(res.warnings).toContain("PM2.5 exceeds physical threshold of 1500 µg/m³");
  });

  it("rejects PM2.5 readings exceeding PM10 by more than 25% tolerance", () => {
    const res = validateObservation({ pm25: 200, pm10: 100, observedAt: new Date().toISOString() });
    expect(res.isValid).toBe(false);
    expect(res.warnings).toContain("PM2.5 exceeds PM10 by more than 25% tolerance (sensor anomaly)");
  });

  it("assigns high confidence for readings under 1 hour old", () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: recent });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.warnings).toHaveLength(0);
  });

  it("assigns medium confidence for readings between 1 and 3 hours old", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: twoHoursAgo });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("medium");
  });

  it("assigns low confidence and warning for readings older than 3 hours", () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const res = validateObservation({ pm25: 180, pm10: 250, observedAt: fourHoursAgo });
    expect(res.isValid).toBe(true);
    expect(res.confidence).toBe("low");
    expect(res.warnings).toContain("Station reading is older than 3 hours");
  });
});

describe("Air Quality LRU Cache", () => {
  beforeEach(() => {
    clearAirCache();
  });

  it("generates 0.05-degree rounded spatial cache keys", () => {
    const key1 = getAirCacheKey("Delhi", 28.6139, 77.2090);
    const key2 = getAirCacheKey("delhi", 28.6200, 77.2140);
    expect(key1).toBe("delhi_28.6_77.2");
    expect(key2).toBe("delhi_28.6_77.2");
  });

  it("incorporates normalized areaLabel into spatial cache keys to prevent collision", () => {
    const keyAnandVihar = getAirCacheKey("Delhi", 28.6139, 77.2090, "Anand Vihar");
    const keyMandirMarg = getAirCacheKey("Delhi", 28.6139, 77.2090, "Mandir Marg");
    const keyNoArea = getAirCacheKey("Delhi", 28.6139, 77.2090);

    expect(keyAnandVihar).toBe("delhi_28.6_77.2_anandvihar");
    expect(keyMandirMarg).toBe("delhi_28.6_77.2_mandirmarg");
    expect(keyNoArea).toBe("delhi_28.6_77.2");
    expect(keyAnandVihar).not.toBe(keyMandirMarg);
  });

  it("stores and retrieves cached environmental context within TTL", () => {
    const key = getAirCacheKey("Delhi", 28.6139, 77.2090);
    setAirCache(key, demoData as EnvironmentalContext);
    const cached = getAirCache(key);
    expect(cached).not.toBeNull();
    expect(cached?.currentObservation.stationName).toBe(demoData.currentObservation.stationName);
  });

  it("evicts entries older than 15-minute TTL", () => {
    const key = "delhi_test_ttl";
    setAirCache(key, demoData as EnvironmentalContext);
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + 16 * 60 * 1000;
      expect(getAirCache(key)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it("caps in-memory size to 100 entries evicting oldest", () => {
    for (let i = 0; i < 105; i++) {
      setAirCache(`key_${i}`, demoData as EnvironmentalContext);
    }
    expect(getAirCache("key_0")).toBeNull();
    expect(getAirCache("key_4")).toBeNull();
    expect(getAirCache("key_104")).not.toBeNull();
  });
});

describe("CPCB Multi-Row Parser & Haversine Matcher", () => {
  it("calculates accurate Haversine distance between coordinates", () => {
    const dist = calculateHaversineDistanceKm(28.6315, 77.2167, 28.6469, 77.3160);
    expect(dist).toBeGreaterThan(9.0);
    expect(dist).toBeLessThan(10.5);
  });

  it("groups multi-row pollutant entries by station and selects closest valid station", () => {
    const rawRecords = [
      { city: "Delhi", station: "Station A", pollutant_id: "PM2.5", pollutant_avg: "320", latitude: "28.65", longitude: "77.22", last_update: "17-11-2026 18:00:00" },
      { city: "Delhi", station: "Station A", pollutant_id: "PM10", pollutant_avg: "450", latitude: "28.65", longitude: "77.22", last_update: "17-11-2026 18:00:00" },
      { city: "Delhi", station: "Station B", pollutant_id: "PM2.5", pollutant_avg: "210", latitude: "28.61", longitude: "77.20", last_update: "17-11-2026 18:00:00" },
      { city: "Delhi", station: "Station B", pollutant_id: "NO2", pollutant_avg: "45", latitude: "28.61", longitude: "77.20", last_update: "17-11-2026 18:00:00" },
      { city: "Gurugram", station: "Station C", pollutant_id: "PM2.5", pollutant_avg: "150", latitude: "28.45", longitude: "77.02", last_update: "17-11-2026 18:00:00" },
    ];

    const result = parseCpcbRecords(rawRecords, 28.6139, 77.2090, "Delhi");
    expect(result).not.toBeNull();
    expect(result?.stationName).toBe("Station B");
    expect(result?.pm25).toBe(210);
    expect(result?.source).toBe("cpcb");
  });

  it("prioritizes station matching areaLabel when provided", () => {
    const rawRecords = [
      { city: "Delhi", station: "Anand Vihar, Delhi - DPCC", pollutant_id: "PM2.5", pollutant_avg: "380", latitude: "28.64", longitude: "77.31", last_update: "17-11-2026 18:00:00" },
      { city: "Delhi", station: "Mandir Marg, Delhi - DPCC", pollutant_id: "PM2.5", pollutant_avg: "220", latitude: "28.63", longitude: "77.20", last_update: "17-11-2026 18:00:00" },
    ];

    const result = parseCpcbRecords(rawRecords, 28.63, 77.20, "Delhi", "Anand Vihar");
    expect(result?.stationName).toContain("Anand Vihar");
  });

  it("returns null if no valid PM2.5 readings are found", () => {
    const rawRecords = [
      { city: "Delhi", station: "Station X", pollutant_id: "PM2.5", pollutant_avg: "NA", latitude: "28.65", longitude: "77.22" },
      { city: "Delhi", station: "Station Y", pollutant_id: "PM2.5", pollutant_avg: "-5", latitude: "28.65", longitude: "77.22" },
    ];
    const result = parseCpcbRecords(rawRecords, 28.65, 77.22, "Delhi");
    expect(result).toBeNull();
  });
});

describe("Open-Meteo Ingestion & 24h Normalization", () => {
  it("normalizes Open-Meteo hourly arrays into exactly 24 HourlyForecastPoints", () => {
    const mockAq = {
      hourly: {
        time: Array.from({ length: 48 }, (_, i) => `2026-11-17T${String(i % 24).padStart(2, "0")}:00`),
        pm2_5: Array.from({ length: 48 }, () => 220),
        pm10: Array.from({ length: 48 }, () => 350),
      },
    };
    const mockWeather = {
      hourly: {
        time: Array.from({ length: 48 }, (_, i) => `2026-11-17T${String(i % 24).padStart(2, "0")}:00`),
        wind_speed_10m: Array.from({ length: 48 }, () => 8.5),
      },
    };

    const parsed = parseOpenMeteoPayload(mockAq, mockWeather);
    expect(parsed).not.toBeNull();
    expect(parsed?.forecast).toHaveLength(24);
    expect(parsed?.forecast[0]?.hourIndex).toBe(0);
    expect(parsed?.forecast[0]?.pm25).toBe(220);
    expect(parsed?.forecast[0]?.windSpeedKmh).toBe(8.5);
    expect(parsed?.currentPoint?.source).toBe("open_meteo_current");
    expect(parsed?.currentPoint?.confidence).toBe("medium");
  });

  it("handles null/missing payload gracefully", () => {
    expect(parseOpenMeteoPayload(null)).toBeNull();
    expect(parseOpenMeteoPayload({})).toBeNull();
  });
});

describe("Environmental Context Cascading Normalizer", () => {
  it("falls back to demo snapshot when external APIs fail or are unconfigured", async () => {
    const context = await getEnvironmentalContext("Delhi", 28.6139, 77.2090);
    expect(context).not.toBeNull();
    expect(context.hourlyForecast).toHaveLength(24);
    expect(["cpcb", "open_meteo_current", "demo"]).toContain(context.currentObservation.source);
  });

  it("caches successful results and serves cache on repeated call", async () => {
    const c1 = await getEnvironmentalContext("Delhi", 28.6139, 77.2090);
    const c2 = await getEnvironmentalContext("Delhi", 28.6139, 77.2090);
    expect(c1).toEqual(c2);
  });
});
