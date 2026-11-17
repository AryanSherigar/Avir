"use client";

import React from "react";
import { Sliders, IndianRupee, Clock, Globe } from "lucide-react";
import { Constraints } from "@/lib/schemas/household";

interface ConstraintsFormProps {
  constraints: Constraints;
  onChange: (constraints: Constraints) => void;
  lang?: "en" | "hi";
}

export function ConstraintsForm({ constraints, onChange, lang = "en" }: ConstraintsFormProps) {
  const isHi = lang === "hi";

  const updateBudget = (val: number) => {
    onChange({ ...constraints, dailyBudgetInr: Math.max(0, val) });
  };

  const updateTimeCap = (val: number) => {
    onChange({ ...constraints, maxExtraTimeMinutesPerDay: Math.max(0, val) });
  };

  const updateLanguage = (prefLang: "en" | "hi") => {
    onChange({ ...constraints, preferredLanguage: prefLang });
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" aria-hidden="true" />
          {isHi ? "व्यावहारिक सीमाएं और प्राथमिकताएं" : "Practicality Constraints & Budget"}
        </h2>
        <p className="text-xs text-slate-500">
          {isHi
            ? "दैनिक वित्तीय बजट और समय की सीमा निर्धारित करें ताकि सिम्युलेटर केवल व्यावहारिक सुझाव दे"
            : "Define daily financial and routine time caps to enforce realistic, feasible interventions"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Daily Budget */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
              {isHi ? "दैनिक बजट सीमा" : "Daily Budget Cap"}
            </span>
            <span className="text-xs font-bold text-emerald-700">₹{constraints.dailyBudgetInr}/day</span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={constraints.dailyBudgetInr}
            onChange={(e) => updateBudget(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>₹0 (Strict Zero Cost)</span>
            <span>₹2,000</span>
          </div>
        </div>

        {/* Max Extra Time */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              {isHi ? "अतिरिक्त समय सीमा" : "Extra Time Cap"}
            </span>
            <span className="text-xs font-bold text-amber-700">
              {constraints.maxExtraTimeMinutesPerDay} {isHi ? "मिनट" : "mins"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={120}
            step={5}
            value={constraints.maxExtraTimeMinutesPerDay}
            onChange={(e) => updateTimeCap(Number(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0 mins</span>
            <span>120 mins</span>
          </div>
        </div>

        {/* Preferred Language */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-2">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            {isHi ? "प्राथमिक भाषा" : "Preferred Language"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateLanguage("en")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                constraints.preferredLanguage === "en"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => updateLanguage("hi")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                constraints.preferredLanguage === "hi"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              हिंदी
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {isHi ? "एआई और इंटरफेस भाषा" : "Used for interface and Gemini synthesis"}
          </p>
        </div>
      </div>
    </section>
  );
}
