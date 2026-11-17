"use client";

import React from "react";
import { Shield, Leaf, Clock, IndianRupee, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { SimulationResult } from "@/lib/schemas/simulation";
import { Constraints } from "@/lib/schemas/household";
import { PillarCard } from "@/components/common/PillarCard";

interface SimulationDeltaViewProps {
  simulation: SimulationResult;
  constraints: Constraints;
  lang?: "en" | "hi";
}

export function SimulationDeltaView({
  simulation,
  constraints,
  lang = "en",
}: SimulationDeltaViewProps) {
  const isHi = lang === "hi";

  const {
    combinedPersonalProtection: prot,
    combinedEnvironmentalContribution: env,
    combinedPracticality: prac,
  } = simulation;

  const costWithinBudget = prac.estimatedCostInr <= constraints.dailyBudgetInr;
  const timeWithinCap = prac.timeImpactMinutesPerDay <= constraints.maxExtraTimeMinutesPerDay;

  return (
    <div
      role="region"
      aria-label="Simulation Delta Results"
      aria-live="polite"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Pillar 1: Personal Protection */}
      <PillarCard
        pillar="protection"
        title={isHi ? "स्तंभ 1: व्यक्तिगत सुरक्षा" : "Pillar 1: Personal Protection"}
        subtitle={isHi ? "शीर्ष संवेदनशील सदस्य के जोखिम में कमी" : "Peak vulnerable member proxy reduction"}
        badge={
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            -{prot.relativeReductionPercentRange[0]}% to -{prot.relativeReductionPercentRange[1]}%
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "बेसलाइन एक्सपोजर:" : "Baseline Peak:"}</span>
            <span className="font-semibold text-slate-800">{prot.baselinePeakVulnerable} µg/m³·h</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "अनुकूलित एक्सपोजर:" : "Projected Peak:"}</span>
            <span className="font-extrabold text-blue-700">{prot.projectedPeakVulnerable} µg/m³·h</span>
          </div>

          <div className="bg-blue-50/70 p-2.5 rounded-lg text-center mt-2">
            <span className="text-[10px] uppercase font-bold text-blue-800 block">
              {isHi ? "कुल टाला गया जोखिम (ΔEproxy)" : "Avoided Exposure (ΔEproxy)"}
            </span>
            <span className="text-lg font-black text-blue-900">
              {prot.deltaPeakExposureProxy > 0 ? `-${prot.deltaPeakExposureProxy}` : prot.deltaPeakExposureProxy}
            </span>
            <span className="text-[10px] text-blue-600 block">µg/m³·h avoided</span>
          </div>
        </div>
      </PillarCard>

      {/* Pillar 2: Environmental Contribution */}
      <PillarCard
        pillar="environmental"
        title={isHi ? "स्तंभ 2: पर्यावरण योगदान" : "Pillar 2: Environmental"}
        subtitle={isHi ? "सड़क और इनडोर उत्सर्जन में कमी" : "Avoided vehicle distance & indoor combustion"}
        badge={
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {env.privateVehicleKmAvoidedPerDay} km/day avoided
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "टाला गया वाहन आवागमन:" : "Vehicle Distance Avoided:"}</span>
            <span className="font-extrabold text-emerald-700">{env.privateVehicleKmAvoidedPerDay} km/day</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "आंतरिक दहन कटौती:" : "Combustion Eliminated:"}</span>
            <span className={`font-semibold ${env.indoorCombustionSourceReduced ? "text-emerald-700" : "text-slate-400"}`}>
              {env.indoorCombustionSourceReduced ? (isHi ? "सक्रिय (धुआं बंद)" : "Active") : (isHi ? "अपरिवर्तित" : "None")}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-2.5 rounded-lg text-xs text-emerald-900 leading-tight">
            <p className="font-semibold text-[11px] mb-0.5">{isHi ? "प्रभाव सारांश:" : "Impact Accounting:"}</p>
            <p className="text-[11px] text-emerald-800">{env.summary}</p>
          </div>
        </div>
      </PillarCard>

      {/* Pillar 3: Practicality */}
      <PillarCard
        pillar="practicality"
        title={isHi ? "स्तंभ 3: व्यावहारिकता" : "Pillar 3: Practicality"}
        subtitle={isHi ? "लागत, समय और दैनिक सुविधा" : "Cost, routine time & feasibility"}
        badge={
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              costWithinBudget && timeWithinCap
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {costWithinBudget && timeWithinCap ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                {isHi ? "बजट के भीतर" : "Feasible"}
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                {isHi ? "सीमा से अधिक" : "Exceeds Cap"}
              </>
            )}
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "कुल दैनिक लागत:" : "Daily Cost:"}</span>
            <span className={`font-bold ${costWithinBudget ? "text-slate-800" : "text-red-600"}`}>
              ₹{prac.estimatedCostInr} / ₹{constraints.dailyBudgetInr} cap
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "अतिरिक्त समय प्रभाव:" : "Routine Time Added:"}</span>
            <span className={`font-bold ${timeWithinCap ? "text-slate-800" : "text-red-600"}`}>
              +{prac.timeImpactMinutesPerDay}m / {constraints.maxExtraTimeMinutesPerDay}m cap
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="text-slate-500">{isHi ? "असुविधा रेटिंग:" : "Inconvenience:"}</span>
            <span className="font-semibold text-slate-800 capitalize">{prac.inconvenienceLevel}</span>
          </div>

          {prac.mapsDirectionsUrl && (
            <a
              href={prac.mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition"
            >
              <span>{isHi ? "गूगल मैप्स मेट्रो रूट खोलें" : "Open Transit Directions"}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </PillarCard>
    </div>
  );
}
