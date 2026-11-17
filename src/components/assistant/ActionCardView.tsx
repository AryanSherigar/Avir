"use client";

import React from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { ChatActionCard } from "@/lib/schemas/ai";

interface ActionCardViewProps {
  card: ChatActionCard;
  onApply: (card: ChatActionCard) => void;
  isApplied?: boolean;
  lang?: "en" | "hi";
}

export function ActionCardView({
  card,
  onApply,
  isApplied = false,
  lang = "en",
}: ActionCardViewProps) {
  const isHi = lang === "hi";

  return (
    <div className="bg-white rounded-lg border border-blue-200 p-3.5 shadow-2xs space-y-2 mt-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <h4 className="text-xs font-bold text-slate-900">{card.title}</h4>
        </div>

        <button
          type="button"
          onClick={() => onApply(card)}
          disabled={isApplied}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
            isApplied
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
          }`}
        >
          {isApplied ? (
            <>
              <Check className="w-3 h-3" />
              <span>{isHi ? "सिम्युलेटर में लागू" : "Applied"}</span>
            </>
          ) : (
            <>
              <span>{isHi ? "सिम्युलेटर में लागू करें" : "Apply to Simulator"}</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">{card.description}</p>

      <div className="bg-blue-50/60 px-2.5 py-1.5 rounded text-[10px] text-blue-800 font-medium">
        <strong>{isHi ? "प्रभाव लेखांकन:" : "Estimated Impact:"}</strong> {card.impactSummary}
      </div>
    </div>
  );
}
