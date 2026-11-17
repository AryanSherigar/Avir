import { EnvironmentalContext, EnvironmentalContextSchema } from "../schemas/air";
import { fetchCpcbObservation } from "./cpcb";
import { fetchOpenMeteoForecast } from "./open-meteo";
import { getAirCache, setAirCache, getAirCacheKey } from "./cache";
import demoAirQuality from "../../../data/demo-air-quality.json";

export async function getEnvironmentalContext(
  city = "Delhi",
  lat = 28.6139,
  lon = 77.209,
  areaLabel?: string
): Promise<EnvironmentalContext> {
  const cacheKey = getAirCacheKey(city, lat, lon, areaLabel);
  const cached = getAirCache(cacheKey);
  if (cached) return cached;

  const [cpcbResult, openMeteoResult] = await Promise.all([
    fetchCpcbObservation(city, lat, lon, areaLabel),
    fetchOpenMeteoForecast(lat, lon),
  ]);

  const warnings: string[] = [];
  let currentObservation = cpcbResult;
  let isDemoFallback = false;

  if (!currentObservation && openMeteoResult?.currentPoint) {
    currentObservation = openMeteoResult.currentPoint;
    warnings.push("CPCB ground stations unavailable; using Open-Meteo numerical model observation");
  }

  const hourlyForecast = openMeteoResult?.forecast ?? demoAirQuality.hourlyForecast;
  if (!openMeteoResult) {
    warnings.push("Open-Meteo forecast unavailable; using curated Delhi historical curve");
  }

  if (!currentObservation) {
    currentObservation = demoAirQuality.currentObservation as EnvironmentalContext["currentObservation"];
    isDemoFallback = true;
    warnings.push("External air services offline; active demo Delhi smog snapshot");
  }

  const context: EnvironmentalContext = {
    currentObservation,
    hourlyForecast,
    dataQualityWarnings: warnings,
    isDemoFallback,
  };

  const parsed = EnvironmentalContextSchema.parse(context);
  setAirCache(cacheKey, parsed);
  return parsed;
}
