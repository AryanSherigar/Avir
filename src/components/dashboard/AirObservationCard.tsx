import React from "react";
import { MapPin, Clock, Wind, Navigation, AlertCircle, Info } from "lucide-react";
import { CurrentObservation, HourlyForecastPoint } from "@/lib/schemas/air";
import { StatusBadge, AirCategory } from "@/components/common/StatusBadge";

interface AirObservationCardProps {
  observation: CurrentObservation;
  forecastPoints: HourlyForecastPoint[];
  lang?: "en" | "hi";
}

function getNaqiCategory(naqi: number | null): AirCategory {
  if (naqi === null) return "moderate";
  if (naqi > 400) return "severe";
  if (naqi > 300) return "very_poor";
  if (naqi > 200) return "poor";
  if (naqi > 100) return "moderate";
  if (naqi > 50) return "satisfactory";
  return "good";
}

export function AirObservationCard({
  observation,
  forecastPoints,
  lang = "en",
}: AirObservationCardProps) {
  const isHi = lang === "hi";
  const naqiCategory = getNaqiCategory(observation.officialNaqi);

  const avgForecastPm25 =
    forecastPoints.length > 0
      ? Math.round(forecastPoints.reduce((acc, p) => acc + p.pm25, 0) / forecastPoints.length)
      : 0;

  const maxWindSpeed =
    forecastPoints.length > 0
      ? Math.max(...forecastPoints.map((p) => p.windSpeedKmh ?? 0))
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* CPCB Ground Station Observation Card */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {observation.source === "cpcb"
                ? isHi
                  ? "सीपीसीबी भू-स्टेशन अवलोकन"
                  : "CPCB Ground Station"
                : isHi
                  ? "स्थानीय अवलोकन (डेमो)"
                  : "Local Observation (Demo)"}
            </span>
            <StatusBadge
              category={naqiCategory}
              value={observation.officialNaqi ?? undefined}
              lang={lang}
            />
          </div>

          <div className="flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{observation.stationName}</h2>
              <p className="text-xs text-slate-500">
                {observation.city}
                {observation.distanceKm !== undefined && (
                  <span className="ml-1 font-medium">({observation.distanceKm} km away)</span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">PM 2.5</span>
              <span className="text-base font-extrabold text-slate-900">
                {observation.pm25 !== null ? Math.round(observation.pm25) : "—"}
              </span>
              <span className="text-[9px] text-slate-400 block">µg/m³</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">PM 10</span>
              <span className="text-base font-extrabold text-slate-900">
                {observation.pm10 !== null ? Math.round(observation.pm10) : "—"}
              </span>
              <span className="text-[9px] text-slate-400 block">µg/m³</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">NO₂</span>
              <span className="text-base font-extrabold text-slate-900">
                {observation.no2 !== null ? Math.round(observation.no2) : "—"}
              </span>
              <span className="text-[9px] text-slate-400 block">µg/m³</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{isHi ? "अवलोकन समय:" : "Observed:"} {observation.observedAt.slice(0, 16).replace("T", " ")}</span>
          </div>
          <span className="capitalize">{observation.confidence} confidence</span>
        </div>
      </section>

      {/* Gridded Forecast Card (Open-Meteo) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {isHi ? "ओपन-मेटियो ग्रिड पूर्वानुमान" : "Open-Meteo Gridded Forecast"}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {isHi ? "24 घंटे का क्षितिज" : "24h Horizon"}
            </span>
          </div>

          <div className="flex items-start gap-2 mb-2">
            <Wind className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isHi ? "वायुमंडलीय फैलाव और मौसम" : "Atmospheric Dispersion & Wind"}
              </h2>
              <p className="text-xs text-slate-500">
                {isHi
                  ? "भौतिक मॉडल (भू-स्टेशन से अलग प्रस्तुत)"
                  : "Numerical atmospheric model (strictly separated from ground sensors)"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Navigation className="w-4 h-4 rotate-45" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {isHi ? "शीर्ष हवा की गति" : "Peak Wind Speed"}
                </span>
                <span className="text-sm font-bold text-slate-900">{maxWindSpeed} km/h</span>
                <span className="text-[10px] text-slate-400 block">
                  {maxWindSpeed < 5 ? (isHi ? "स्थिर हवा (कम फैलाव)" : "Stagnant (Trap)") : (isHi ? "सक्रिय फैलाव" : "Active Dispersion")}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  {isHi ? "औसत 24h PM2.5" : "Mean 24h PM2.5"}
                </span>
                <span className="text-sm font-bold text-slate-900">{avgForecastPm25} µg/m³</span>
                <span className="text-[10px] text-slate-400 block">
                  {isHi ? "मॉडल अनुमान" : "Gridded estimate"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            {isHi
              ? "वैज्ञानिक ईमानदारी: सीपीसीबी अवलोकन और मेटियो पूर्वानुमान कभी मिश्रित नहीं किए जाते।"
              : "Scientific Integrity: Station readings and model forecasts are never blended."}
          </span>
        </div>
      </section>
    </div>
  );
}
