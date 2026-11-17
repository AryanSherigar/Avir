"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sliders, RotateCcw, AlertCircle, RefreshCw } from "lucide-react";
import { useHousehold } from "@/lib/storage";
import { Activity } from "@/lib/schemas/household";
import { SimulationResult } from "@/lib/schemas/simulation";
import { InterventionSelector } from "@/components/simulator/InterventionSelector";
import { ActivitySliderList } from "@/components/simulator/ActivitySliderList";
import { SimulationDeltaView } from "@/components/simulator/SimulationDeltaView";

export default function SimulatorPage() {
  const { profile, isLoaded } = useHousehold();
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "n95_two_wheeler_commute",
    "metro_transit_shift",
  ]);
  const [activityOverrides, setActivityOverrides] = useState<Activity[]>([]);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lang = profile.constraints.preferredLanguage;
  const isHi = lang === "hi";

  const runSimulation = useCallback(
    async (ids: string[], overrides: Activity[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            selectedInterventionIds: ids,
            activityOverrides: overrides.length > 0 ? overrides : undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`Simulation failed with status ${res.status}`);
        }

        const json: SimulationResult = await res.json();
        setSimulation(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to run simulation");
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  useEffect(() => {
    if (isLoaded) {
      runSimulation(selectedIds, activityOverrides);
    }
  }, [isLoaded, profile, selectedIds, activityOverrides, runSimulation]);

  const handleToggleIntervention = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
  };

  const handleActivityTimeChange = (activityId: string, newStart: string, newEnd: string) => {
    const existing = profile.activities.find((a) => a.id === activityId);
    if (!existing) return;

    const updatedActivity: Activity = {
      ...existing,
      startTime: newStart,
      endTime: newEnd,
    };

    const nextOverrides = activityOverrides.some((a) => a.id === activityId)
      ? activityOverrides.map((a) => (a.id === activityId ? updatedActivity : a))
      : [...activityOverrides, updatedActivity];

    setActivityOverrides(nextOverrides);
  };

  const handleResetSimulator = () => {
    setSelectedIds([]);
    setActivityOverrides([]);
  };

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
        {isHi ? "सिम्युलेटर लोड हो रहा है..." : "Initializing routine simulator..."}
      </div>
    );
  }

  // Active activities with overrides applied
  const currentActivities = profile.activities.map((act) => {
    const override = activityOverrides.find((o) => o.id === act.id);
    return override ?? act;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {isHi ? "काउंटरफैक्चुअल रूटीन सिम्युलेटर" : "Counterfactual Routine Simulator"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isHi
              ? "शून्य-टोकन तात्कालिक गणना: अनुकूलन विकल्पों को चालू/बंद करें और तीनों स्तंभों पर प्रभाव देखें"
              : "Zero-token deterministic simulation: Toggle interventions and shift schedules to verify the 3 pillars"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetSimulator}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            {isHi ? "सिम्युलेटर रीसेट करें" : "Reset Toggles"}
          </button>
        </div>
      </div>

      {/* 3 Pillars Delta View */}
      {simulation && (
        <SimulationDeltaView
          simulation={simulation}
          constraints={profile.constraints}
          lang={lang}
        />
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Layout: Interventions & Schedule Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {isHi ? "हस्तक्षेप सूची और टॉगल" : "Eligible Interventions Catalogue"}
            </h2>
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {selectedIds.length} {isHi ? "चयनित" : "active"}
            </span>
          </div>
          <InterventionSelector
            selectedIds={selectedIds}
            onToggle={handleToggleIntervention}
            lang={lang}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {isHi ? "दैनिक गतिविधियों का समय समायोजन" : "Diurnal Schedule Adjustments"}
            </h2>
            {activityOverrides.length > 0 && (
              <span className="text-xs text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {activityOverrides.length} {isHi ? "शिफ्ट किए गए" : "shifted"}
              </span>
            )}
          </div>
          <ActivitySliderList
            activities={currentActivities}
            members={profile.members}
            nonNegotiableIds={profile.constraints.nonNegotiableActivityIds}
            onActivityTimeChange={handleActivityTimeChange}
            lang={lang}
          />
        </div>
      </div>
    </div>
  );
}
