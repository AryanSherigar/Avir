import React from "react";
import { Info, AlertTriangle } from "lucide-react";

interface FallbackBannerProps {
  isAirFallback?: boolean;
  isAiFallback?: boolean;
  lang?: "en" | "hi";
  className?: string;
}

export function FallbackBanner({
  isAirFallback = false,
  isAiFallback = false,
  lang = "en",
  className = "",
}: FallbackBannerProps) {
  if (!isAirFallback && !isAiFallback) {
    return null;
  }

  const isHindi = lang === "hi";

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`border-l-4 border-amber-500 bg-amber-50/90 text-amber-900 p-3 rounded-r-lg text-xs flex flex-col gap-1 shadow-xs ${className}`}
    >
      {isAirFallback && (
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            {isHindi
              ? "ऑफ़लाइन/डेमो वायु गुणवत्ता मोड: वास्तविक सीपीसीबी डेटा अनुपलब्ध; प्रमाणित दिल्ली शीतकालीन स्मॉग बेसलाइन सक्रिय है।"
              : "Offline Demo Air Quality Mode: Live CPCB ground data unavailable; using certified Delhi winter smog baseline."}
          </span>
        </div>
      )}
      {isAiFallback && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            {isHindi
              ? "डिटरमिनिस्टिक फॉलबैक सक्रिय: शून्य-लेटेंसी नियम-आधारित इंजन द्वारा संश्लेषित योजना।"
              : "Deterministic Engine Active: AI plan synthesis generated using zero-latency rule-based engine."}
          </span>
        </div>
      )}
    </aside>
  );
}
