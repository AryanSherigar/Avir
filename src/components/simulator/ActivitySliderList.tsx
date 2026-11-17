"use client";

import React from "react";
import { Clock, Lock, Sparkles, ArrowRight } from "lucide-react";
import { Activity, Member } from "@/lib/schemas/household";

interface ActivitySliderListProps {
  activities: Activity[];
  members: Member[];
  nonNegotiableIds: string[];
  onActivityTimeChange: (activityId: string, newStart: string, newEnd: string) => void;
  lang?: "en" | "hi";
}

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatMinutes(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ActivitySliderList({
  activities,
  members,
  nonNegotiableIds,
  onActivityTimeChange,
  lang = "en",
}: ActivitySliderListProps) {
  const isHi = lang === "hi";

  const handleShift = (act: Activity, deltaMinutes: number) => {
    const startMins = parseMinutes(act.startTime);
    const endMins = parseMinutes(act.endTime);
    const duration = endMins >= startMins ? endMins - startMins : endMins + 1440 - startMins;

    const newStartMins = startMins + deltaMinutes;
    const newEndMins = newStartMins + duration;

    onActivityTimeChange(act.id, formatMinutes(newStartMins), formatMinutes(newEndMins));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            {isHi ? "लचीली गतिविधियों का समय शिफ्ट" : "Routine Time-Shift Controls"}
          </h3>
          <p className="text-[11px] text-slate-500">
            {isHi
              ? "लॉक की गई गतिविधियां सुरक्षित हैं; स्वच्छ वायु घंटों का लाभ उठाने के लिए लचीले समय को शिफ्ट करें"
              : "Locked routines are frozen; shift flexible activities into afternoon dispersion troughs"}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {activities.map((act) => {
          const isLocked = nonNegotiableIds.includes(act.id);
          const member = members.find((m) => m.id === act.memberId);

          return (
            <div
              key={act.id}
              className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLocked ? "bg-slate-50/70 border-slate-200 opacity-75" : "bg-blue-50/30 border-blue-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isLocked ? (
                  <span className="p-1.5 rounded bg-amber-100 text-amber-800" title="Locked activity">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="p-1.5 rounded bg-blue-100 text-blue-800" title="Flexible activity">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 capitalize">{act.type.replace("_", " ")}</span>
                    {member && <span className="text-slate-400">({member.roleLabel})</span>}
                    {isLocked && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                        {isHi ? "लॉक" : "FROZEN"}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {act.startTime} → {act.endTime} ({act.indoor ? "Indoor" : "Outdoor"})
                  </span>
                </div>
              </div>

              {/* Shift buttons */}
              {isLocked ? (
                <span className="text-[11px] text-slate-400 italic">
                  {isHi ? "गैर-परक्राम्य (लॉक किया हुआ)" : "Non-negotiable lock"}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleShift(act, -60)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                  >
                    -1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(act, -30)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                  >
                    -30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(act, 30)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(act, 60)}
                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                  >
                    +1h
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
