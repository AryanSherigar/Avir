import React from "react";
import { AlertTriangle, Wind, ShieldAlert, Activity, CheckCircle } from "lucide-react";

export type AirCategory = "severe" | "very_poor" | "poor" | "moderate" | "satisfactory" | "good";

interface StatusBadgeProps {
  category: AirCategory;
  value?: number;
  lang?: "en" | "hi";
  className?: string;
}

const CATEGORY_CONFIG: Record<
  AirCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    textClass: string;
    borderClass: string;
    labels: { en: string; hi: string };
  }
> = {
  severe: {
    icon: AlertTriangle,
    bgClass: "bg-red-50 text-red-700",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    labels: { en: "Severe Smog", hi: "गंभीर स्मॉग" },
  },
  very_poor: {
    icon: Wind,
    bgClass: "bg-purple-50 text-purple-700",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
    labels: { en: "Very Poor", hi: "बहुत खराब" },
  },
  poor: {
    icon: ShieldAlert,
    bgClass: "bg-orange-50 text-orange-700",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
    labels: { en: "Poor", hi: "खराब" },
  },
  moderate: {
    icon: Activity,
    bgClass: "bg-amber-50 text-amber-700",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    labels: { en: "Moderate", hi: "मध्यम" },
  },
  satisfactory: {
    icon: CheckCircle,
    bgClass: "bg-emerald-50 text-emerald-700",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    labels: { en: "Satisfactory", hi: "संतोषजनक" },
  },
  good: {
    icon: CheckCircle,
    bgClass: "bg-emerald-50 text-emerald-700",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
    labels: { en: "Good", hi: "अच्छा" },
  },
};

export function StatusBadge({ category, value, lang = "en", className = "" }: StatusBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.moderate;
  const Icon = config.icon;
  const label = config.labels[lang] ?? config.labels.en;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bgClass} ${config.borderClass} ${className}`}
      role="status"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      {value !== undefined && <span className="font-bold ml-0.5">({value})</span>}
    </span>
  );
}
