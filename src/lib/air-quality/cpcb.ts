import { CurrentObservation } from "../schemas/air";
import { validateObservation } from "./validation";

export interface CpcbRawRecord {
  country?: string;
  state?: string;
  city?: string;
  station: string;
  last_update?: string;
  pollutant_id: string;
  pollutant_avg?: string;
  latitude?: string;
  longitude?: string;
}

interface StationAggregate {
  station: string;
  city: string;
  lat: number;
  lon: number;
  observedAt: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
}

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function parseCpcbRecords(
  records: unknown[],
  targetLat: number,
  targetLon: number,
  queryCity?: string,
  areaLabel?: string
): CurrentObservation | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  const grouped = groupRecordsByStation(records as CpcbRawRecord[], queryCity);
  const validCandidates = Array.from(grouped.values()).filter(isCandidateValid);
  if (validCandidates.length === 0) return null;

  const selected = selectBestStation(validCandidates, targetLat, targetLon, areaLabel);
  if (!selected) return null;

  const distanceKm = calculateHaversineDistanceKm(targetLat, targetLon, selected.lat, selected.lon);
  const validation = validateObservation({
    pm25: selected.pm25,
    pm10: selected.pm10,
    observedAt: selected.observedAt,
  });

  return {
    stationName: selected.station,
    city: selected.city,
    source: "cpcb",
    observedAt: selected.observedAt,
    pm25: selected.pm25,
    pm10: selected.pm10,
    no2: selected.no2,
    officialNaqi: null,
    confidence: validation.confidence,
    distanceKm,
  };
}

function groupRecordsByStation(records: CpcbRawRecord[], queryCity?: string): Map<string, StationAggregate> {
  const map = new Map<string, StationAggregate>();
  const filterCity = queryCity?.trim().toLowerCase();

  for (const r of records) {
    if (!r.station) continue;
    if (filterCity && r.city && r.city.trim().toLowerCase() !== filterCity) continue;

    const lat = parseFloat(r.latitude || "0");
    const lon = parseFloat(r.longitude || "0");
    const existing = map.get(r.station) || {
      station: r.station,
      city: r.city || queryCity || "Delhi",
      lat,
      lon,
      observedAt: normalizeCpcbDate(r.last_update),
      pm25: null,
      pm10: null,
      no2: null,
    };

    assignPollutant(existing, r.pollutant_id, r.pollutant_avg);
    map.set(r.station, existing);
  }

  return map;
}

function assignPollutant(station: StationAggregate, pollutantId?: string, valueStr?: string): void {
  if (!valueStr || valueStr === "NA") return;
  const val = parseFloat(valueStr);
  if (isNaN(val)) return;

  const id = pollutantId?.toUpperCase();
  if (id === "PM2.5") station.pm25 = val;
  else if (id === "PM10") station.pm10 = val;
  else if (id === "NO2") station.no2 = val;
}

function isCandidateValid(station: StationAggregate): boolean {
  return station.pm25 !== null && station.pm25 > 0 && station.lat !== 0 && station.lon !== 0;
}

function selectBestStation(
  stations: StationAggregate[],
  targetLat: number,
  targetLon: number,
  areaLabel?: string
): StationAggregate | null {
  const normArea = areaLabel?.trim().toLowerCase();
  if (normArea) {
    const areaMatch = stations.find((s) => s.station.toLowerCase().includes(normArea));
    if (areaMatch) return areaMatch;
  }

  let closest: StationAggregate | null = null;
  let minDistance = Infinity;

  for (const s of stations) {
    const d = calculateHaversineDistanceKm(targetLat, targetLon, s.lat, s.lon);
    if (d < minDistance) {
      minDistance = d;
      closest = s;
    }
  }

  return closest;
}

function normalizeCpcbDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, h, m, s] = match;
    return new Date(`${year}-${month}-${day}T${h}:${m}:${s}+05:30`).toISOString();
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function fetchCpcbObservation(
  city: string,
  lat: number,
  lon: number,
  areaLabel?: string
): Promise<CurrentObservation | null> {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=${apiKey}&format=json&limit=500&filters%5Bcity%5D=${encodeURIComponent(city)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    return parseCpcbRecords(data.records, lat, lon, city, areaLabel);
  } catch {
    return null;
  }
}
