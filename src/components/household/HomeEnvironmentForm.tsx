"use client";

import React from "react";
import { Home, Wind, Flame, Fan, Sparkles } from "lucide-react";
import { HomeEnvironment } from "@/lib/schemas/household";

interface HomeEnvironmentFormProps {
  home: HomeEnvironment;
  onChange: (home: HomeEnvironment) => void;
  lang?: "en" | "hi";
}

export function HomeEnvironmentForm({ home, onChange, lang = "en" }: HomeEnvironmentFormProps) {
  const isHi = lang === "hi";

  const updateField = <K extends keyof HomeEnvironment>(key: K, value: HomeEnvironment[K]) => {
    onChange({ ...home, [key]: value });
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Home className="w-4 h-4 text-blue-600" aria-hidden="true" />
          {isHi ? "घर का वातावरण और वेंटिलेशन" : "Housing & Indoor Sources"}
        </h2>
        <p className="text-xs text-slate-500">
          {isHi
            ? "कमरे का वेंटिलेशन और आंतरिक उत्सर्जन स्रोत आंतरिक इनफिल्ट्रेशन दर निर्धारित करते हैं"
            : "Structural ventilation and indoor combustion drive indoor infiltration and decay dynamics"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ventilation */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-blue-600" />
            {isHi ? "प्राकृतिक वेंटिलेशन" : "Ventilation Level"}
          </label>
          <select
            value={home.ventilation}
            onChange={(e) => updateField("ventilation", e.target.value as HomeEnvironment["ventilation"])}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
          >
            <option value="low">{isHi ? "कम (खिड़कियां सीलबंद / एसी)" : "Low (Tightly sealed / AC)"}</option>
            <option value="moderate">{isHi ? "मध्यम (सामान्य वेंटिलेशन)" : "Moderate (Standard Indian Flat)"}</option>
            <option value="good">{isHi ? "अच्छा (खुली खिड़कियां / हवादार)" : "Good (Open / Well Ventilated)"}</option>
          </select>
        </div>

        {/* Cooking Fuel */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            {isHi ? "रसोई का ईंधन" : "Primary Cooking Fuel"}
          </label>
          <select
            value={home.cookingFuel}
            onChange={(e) => updateField("cookingFuel", e.target.value as HomeEnvironment["cookingFuel"])}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
          >
            <option value="lpg">{isHi ? "एलपीजी गैस (LPG Cylinder / Piped Gas)" : "LPG (Piped / Cylinder)"}</option>
            <option value="electric_induction">{isHi ? "बिजली / इंडक्शन (Induction Cooktop)" : "Electric / Induction"}</option>
            <option value="solid_fuel">{isHi ? "ठोस ईंधन (लकड़ी / कोयला)" : "Solid Fuel (Wood / Coal)"}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={home.hasOutdoorExhaust}
            onChange={(e) => updateField("hasOutdoorExhaust", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span className="flex items-center gap-1">
            <Fan className="w-3.5 h-3.5 text-slate-500" />
            {isHi ? "रसोई में एग्जॉस्ट फैन" : "Kitchen Exhaust Fan"}
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={home.hasAirPurifier}
            onChange={(e) => updateField("hasAirPurifier", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            {isHi ? "हेपा एयर प्यूरीफायर" : "HEPA Air Purifier"}
          </span>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={home.usesIncenseOrCoils}
            onChange={(e) => updateField("usesIncenseOrCoils", e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <span>{isHi ? "अगरबत्ती / धूपबत्ती का प्रयोग" : "Uses Incense / Dhoop"}</span>
        </label>
      </div>
    </section>
  );
}
