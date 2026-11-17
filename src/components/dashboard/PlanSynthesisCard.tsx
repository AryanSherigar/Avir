import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Leaf, Clock, HeartPulse } from "lucide-react";
import { PlanExplanation } from "@/lib/schemas/ai";
import { EvaluatedIntervention } from "@/lib/schemas/simulation";

interface PlanSynthesisCardProps {
  explanation: PlanExplanation;
  evaluatedInterventions: EvaluatedIntervention[];
  aiFallback?: boolean;
  lang?: "en" | "hi";
}

export function PlanSynthesisCard({
  explanation,
  evaluatedInterventions,
  aiFallback = false,
  lang = "en",
}: PlanSynthesisCardProps) {
  const isHi = lang === "hi";

  return (
    <section className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              {aiFallback
                ? isHi
                  ? "डिटरमिनिस्टिक अनुकूलन योजना"
                  : "Deterministic Adaptation Plan"
                : isHi
                  ? "एआई अनुकूली संश्लेषण (Pattern A)"
                  : "Gemini Adaptive Synthesis"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{explanation.headline}</h2>
        </div>

        <Link
          href="/simulator"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold self-start sm:self-auto shadow-xs transition"
        >
          <span>{isHi ? "सिम्युलेटर में परीक्षण करें" : "Test in Simulator"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Executive Summary */}
      <div className="bg-blue-50/50 rounded-lg p-3.5 border border-blue-100 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-blue-900 mb-1">{isHi ? "कार्यकारी सारांश" : "Executive Summary"}</p>
        <p>{explanation.executiveSummary}</p>
      </div>

      {/* Vulnerable Member Advice */}
      <div className="bg-amber-50/60 rounded-lg p-3.5 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <HeartPulse className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950 mb-0.5">
            {isHi ? "शीर्ष संवेदनशील सदस्य के लिए विशेष सुरक्षा" : "Peak Vulnerable Member Protective Guidance"}
          </p>
          <p className="text-amber-900 leading-relaxed">{explanation.vulnerableMemberAdvice}</p>
        </div>
      </div>

      {/* Actionable Recommendations with 3 Pillars */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {isHi ? "अनुशंसित हस्तक्षेप (3 स्तंभों का विवरण)" : "Actionable Interventions (3 Non-Negotiable Pillars)"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {explanation.householdRecommendations.map((rec) => (
            <div
              key={rec.interventionId}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-900 mb-2">{rec.recommendationText}</p>

                <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-200/60">
                  <div className="flex items-start gap-1.5 text-blue-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isHi ? "सुरक्षा:" : "Protection:"}</strong> {rec.threePillarJustification.protection}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-emerald-800">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isHi ? "पर्यावरण:" : "Environment:"}</strong> {rec.threePillarJustification.contribution}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-amber-800">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isHi ? "व्यावहारिकता:" : "Practicality:"}</strong> {rec.threePillarJustification.practicality}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
