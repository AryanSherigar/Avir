import React from "react";
import { Cpu, CheckCircle2 } from "lucide-react";

interface ToolExecutionBadgeProps {
  toolName: string;
  lang?: "en" | "hi";
}

const TOOL_DESCRIPTIONS: Record<string, { en: string; hi: string }> = {
  simulate_custom_routine: {
    en: "Deterministic Simulation Engine Consulted",
    hi: "डिटरमिनिस्टिक सिम्युलेशन इंजन परामर्शित",
  },
  get_cleanest_outdoor_windows: {
    en: "Hourly Diurnal Model Consulted (Clean Windows)",
    hi: "प्रति घंटा वायु मॉडल विश्लेषित (स्वच्छ विंडो)",
  },
  evaluate_metro_transit_shift: {
    en: "Transit Emission Calculator Consulted",
    hi: "मेट्रो उत्सर्जन कैलकुलेटर विश्लेषित",
  },
};

export function ToolExecutionBadge({ toolName, lang = "en" }: ToolExecutionBadgeProps) {
  const isHi = lang === "hi";
  const desc = TOOL_DESCRIPTIONS[toolName] ?? {
    en: `Deterministic Tool: ${toolName}`,
    hi: `डिटरमिनिस्टिक टूल: ${toolName}`,
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
      <Cpu className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
      <span className="font-medium">{isHi ? desc.hi : desc.en}</span>
      <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
    </div>
  );
}
