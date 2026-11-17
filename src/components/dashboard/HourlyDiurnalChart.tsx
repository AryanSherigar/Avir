"use client";

import React, { useState } from "react";
import { TrendingUp, Sun, Moon, AlertTriangle } from "lucide-react";
import { HourlyForecastPoint } from "@/lib/schemas/air";

interface HourlyDiurnalChartProps {
  points: HourlyForecastPoint[];
  lang?: "en" | "hi";
}

export function HourlyDiurnalChart({ points, lang = "en" }: HourlyDiurnalChartProps) {
  const isHi = lang === "hi";
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return null;
  }

  const maxVal = Math.max(...points.map((p) => p.pm25), 350);
  const minVal = 0;
  const height = 140;
  const width = 600;
  const paddingX = 20;
  const paddingY = 20;

  const getX = (idx: number) => paddingX + (idx / (points.length - 1)) * (width - 2 * paddingX);
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);

  const polylineCoords = points
    .map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.pm25).toFixed(1)}`)
    .join(" ");

  const areaCoords = `${getX(0)},${height - paddingY} ${polylineCoords} ${getX(points.length - 1)},${height - paddingY}`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" aria-hidden="true" />
            {isHi ? "24-घंटे का दैनिक वायु गुणवत्ता वक्र (Diurnal Curve)" : "24-Hour Diurnal PM2.5 Curve"}
          </h2>
          <p className="text-xs text-slate-500">
            {isHi
              ? "सुबह का इनवर्जन पीक (06:00–09:00) और दोपहर का वेंटिलेशन ट्रफ (13:00–16:00)"
              : "Morning inversion trapping peak vs afternoon boundary layer dispersion trough"}
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
            {isHi ? "सुबह का पीक (06–09)" : "Peak (06–09)"}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            {isHi ? "स्वच्छ विंडो (13–16)" : "Cleanest (13–16)"}
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none"
          preserveAspectRatio="none"
        >
          {/* Highlight zones: 06:00-09:00 Morning peak (hours 6 to 9) */}
          <rect
            x={getX(6)}
            y={paddingY}
            width={getX(9) - getX(6)}
            height={height - 2 * paddingY}
            fill="#fee2e2"
            opacity="0.45"
          />

          {/* Highlight zone: 13:00-16:00 Afternoon dispersion trough (hours 13 to 16) */}
          <rect
            x={getX(13)}
            y={paddingY}
            width={getX(16) - getX(13)}
            height={height - 2 * paddingY}
            fill="#d1fae5"
            opacity="0.45"
          />

          {/* Shaded Area */}
          <polygon points={areaCoords} fill="url(#blueGradient)" opacity="0.15" />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#93c5fd" />
            </linearGradient>
          </defs>

          {/* Curve */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineCoords}
          />

          {/* Interactive Points */}
          {points.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.pm25);
            const isHovered = hoveredIdx === idx;
            const isMorningPeak = idx >= 6 && idx <= 9;
            const isAfternoonTrough = idx >= 13 && idx <= 16;
            const color = isMorningPeak ? "#dc2626" : isAfternoonTrough ? "#059669" : "#2563eb";

            return (
              <circle
                key={p.hourIndex}
                cx={cx}
                cy={cy}
                r={isHovered ? 5.5 : 2.5}
                fill={color}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip / Active Point readout */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>00:00 (Midnight)</span>
          {hoveredPoint ? (
            <span className="font-semibold text-slate-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {hoveredPoint.isoTime.slice(11, 16)} hrs:{" "}
              <span className="text-blue-700 font-bold">{Math.round(hoveredPoint.pm25)} µg/m³</span>
              {hoveredPoint.windSpeedKmh !== undefined && ` (${hoveredPoint.windSpeedKmh} km/h wind)`}
            </span>
          ) : (
            <span className="text-slate-400">
              {isHi ? "बिंदु पर होवर करके प्रति घंटा स्तर देखें" : "Hover points for hourly ambient levels"}
            </span>
          )}
          <span>23:00 (Night)</span>
        </div>
      </div>
    </section>
  );
}
