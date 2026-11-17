import { CurrentObservation, HourlyForecastPoint } from "../schemas/air";

interface OpenMeteoAqResponse {
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
  };
}

interface OpenMeteoWeatherResponse {
  hourly?: {
    time?: string[];
    wind_speed_10m?: (number | null)[];
  };
}

export function parseOpenMeteoPayload(
  aqData: unknown,
  weatherData?: unknown
): { forecast: HourlyForecastPoint[]; currentPoint: CurrentObservation | null } | null {
  const aq = aqData as OpenMeteoAqResponse | null;
  if (!aq?.hourly?.time || !aq.hourly.pm2_5 || !aq.hourly.pm10) return null;

  const times = aq.hourly.time;
  const pm25Arr = aq.hourly.pm2_5;
  const pm10Arr = aq.hourly.pm10;
  const weather = weatherData as OpenMeteoWeatherResponse | null;
  const windArr = weather?.hourly?.wind_speed_10m;

  const forecast: HourlyForecastPoint[] = [];
  const limit = Math.min(24, times.length);

  for (let i = 0; i < limit; i++) {
    const iso = times[i] ?? new Date().toISOString();
    const pm25Val = pm25Arr[i];
    const pm10Val = pm10Arr[i];
    const windVal = windArr ? windArr[i] : undefined;

    forecast.push({
      hourIndex: i,
      isoTime: iso,
      pm25: pm25Val !== null && pm25Val !== undefined ? Math.max(0, pm25Val) : 0,
      pm10: pm10Val !== null && pm10Val !== undefined ? Math.max(0, pm10Val) : 0,
      windSpeedKmh: windVal !== null && windVal !== undefined ? Math.max(0, windVal) : undefined,
    });
  }

  if (forecast.length !== 24) return null;

  const first = forecast[0];
  if (!first) return null;

  const currentPoint: CurrentObservation = {
    stationName: "Open-Meteo Gridded Model",
    city: "Local Region",
    source: "open_meteo_current",
    observedAt: first.isoTime,
    pm25: first.pm25,
    pm10: first.pm10,
    no2: null,
    officialNaqi: null,
    confidence: "medium",
  };

  return { forecast, currentPoint };
}

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number
): Promise<{ forecast: HourlyForecastPoint[]; currentPoint: CurrentObservation | null } | null> {
  try {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10&forecast_days=2&timezone=auto`;
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m&forecast_days=2&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const [aqRes, weatherRes] = await Promise.all([
      fetch(aqUrl, { signal: controller.signal }),
      fetch(weatherUrl, { signal: controller.signal }),
    ]);
    clearTimeout(timeout);

    if (!aqRes.ok) return null;
    const aqData = await aqRes.json();
    const weatherData = weatherRes.ok ? await weatherRes.json() : undefined;

    return parseOpenMeteoPayload(aqData, weatherData);
  } catch {
    return null;
  }
}
