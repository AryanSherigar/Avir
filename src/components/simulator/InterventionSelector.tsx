"use client";

import React from "react";
import { CheckSquare, Square, IndianRupee, Clock, ShieldCheck, Leaf, Home, Calendar } from "lucide-react";
import catalogData from "../../../data/interventions.json";

interface InterventionItem {
  id: string;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  category: "exposure_reduction" | "emission_reduction" | "indoor_air" | "schedule";
  practicality: {
    estimatedCostInr: number;
    timeImpactMinutesPerDay: number;
    inconvenienceLevel: "low" | "medium" | "high";
  };
}

const INTERVENTIONS: InterventionItem[] = catalogData as InterventionItem[];

interface InterventionSelectorProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  lang?: "en" | "hi";
}

const CATEGORY_META = {
  exposure_reduction: {
    en: "Personal Exposure Reduction",
    hi: "व्यक्तिगत जोखिम में कमी",
    icon: ShieldCheck,
    color: "text-blue-600",
  },
  emission_reduction: {
    en: "Household Emission Mitigation",
    hi: "घरेलू उत्सर्जन में कमी",
    icon: Leaf,
    color: "text-emerald-600",
  },
  indoor_air: {
    en: "Indoor Air Quality Controls",
    hi: "आंतरिक वायु गुणवत्ता नियंत्रण",
    icon: Home,
    color: "text-amber-600",
  },
  schedule: {
    en: "Diurnal Schedule Timing",
    hi: "दैनिक समय समायोजन",
    icon: Calendar,
    color: "text-purple-600",
  },
};

export function InterventionSelector({
  selectedIds,
  onToggle,
  lang = "en",
}: InterventionSelectorProps) {
  const isHi = lang === "hi";

  const categories = ["exposure_reduction", "emission_reduction", "indoor_air", "schedule"] as const;

  return (
    <div className="space-y-4">
      {categories.map((catKey) => {
        const meta = CATEGORY_META[catKey];
        const Icon = meta.icon;
        const items = INTERVENTIONS.filter((item) => item.category === catKey);

        if (items.length === 0) return null;

        return (
          <div key={catKey} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <Icon className={`w-4 h-4 ${meta.color}`} />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {isHi ? meta.hi : meta.en}
              </h3>
            </div>

            <div className="space-y-2">
              {items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggle(item.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-300"
                        : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                    }`}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        onToggle(item.id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="mt-0.5 text-blue-600 shrink-0 focus:outline-none"
                      tabIndex={-1}
                      aria-hidden="true"
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {isHi ? item.title.hi : item.title.en}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            <IndianRupee className="w-2.5 h-2.5" />
                            {item.practicality.estimatedCostInr}
                          </span>
                          {item.practicality.timeImpactMinutesPerDay > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                              <Clock className="w-2.5 h-2.5" />
                              +{item.practicality.timeImpactMinutesPerDay}m
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
                        {isHi ? item.description.hi : item.description.en}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
