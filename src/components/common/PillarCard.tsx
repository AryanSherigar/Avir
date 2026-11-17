import React from "react";
import { Shield, Leaf, Clock, IndianRupee, AlertCircle } from "lucide-react";

export type PillarType = "protection" | "environmental" | "practicality";

interface PillarCardProps {
  pillar: PillarType;
  title: string;
  subtitle?: string;
  lang?: "en" | "hi";
  children: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

const PILLAR_CONFIG = {
  protection: {
    icon: Shield,
    accentBorder: "border-blue-200",
    headerBg: "bg-blue-50/80 text-blue-900",
    iconColor: "text-blue-600",
  },
  environmental: {
    icon: Leaf,
    accentBorder: "border-emerald-200",
    headerBg: "bg-emerald-50/80 text-emerald-900",
    iconColor: "text-emerald-600",
  },
  practicality: {
    icon: Clock,
    accentBorder: "border-amber-200",
    headerBg: "bg-amber-50/80 text-amber-900",
    iconColor: "text-amber-600",
  },
};

export function PillarCard({
  pillar,
  title,
  subtitle,
  children,
  badge,
  className = "",
}: PillarCardProps) {
  const config = PILLAR_CONFIG[pillar];
  const Icon = config.icon;

  return (
    <div
      className={`bg-white rounded-xl border ${config.accentBorder} shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${config.headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} aria-hidden="true" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        {badge}
      </div>
      {subtitle && <p className="text-xs text-slate-500 px-4 pt-2.5">{subtitle}</p>}
      <div className="p-4 flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
}
