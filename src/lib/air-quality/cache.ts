import { EnvironmentalContext } from "../schemas/air";

interface CacheEntry {
  data: EnvironmentalContext;
  expiresAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;

const airCache = new Map<string, CacheEntry>();

export function getAirCacheKey(city: string, lat: number, lon: number): string {
  const normCity = city.trim().toLowerCase();
  const roundedLat = Math.round(lat * 20) / 20;
  const roundedLon = Math.round(lon * 20) / 20;
  return `${normCity}_${roundedLat}_${roundedLon}`;
}

export function getAirCache(key: string): EnvironmentalContext | null {
  const entry = airCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    airCache.delete(key);
    return null;
  }

  airCache.delete(key);
  airCache.set(key, entry);
  return entry.data;
}

export function setAirCache(key: string, data: EnvironmentalContext): void {
  if (airCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = airCache.keys().next().value;
    if (oldestKey !== undefined) {
      airCache.delete(oldestKey);
    }
  }

  airCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearAirCache(): void {
  airCache.clear();
}
