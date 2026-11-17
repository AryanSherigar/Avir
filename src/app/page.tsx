"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useHousehold } from "@/lib/storage";
import { PlanResponse } from "@/lib/schemas/ai";
import { FallbackBanner } from "@/components/common/FallbackBanner";
import { AirObservationCard } from "@/components/dashboard/AirObservationCard";
import { HourlyDiurnalChart } from "@/components/dashboard/HourlyDiurnalChart";
import { MemberExposureGrid } from "@/components/dashboard/MemberExposureGrid";
import { PlanSynthesisCard } from "@/components/dashboard/PlanSynthesisCard";

export default function DashboardPage() {
  const { profile, isLoaded } = useHousehold();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lang = profile.constraints.preferredLanguage;
  const isHi = lang === "hi";

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (!res.ok) {
        throw new Error(`Plan request failed with status ${res.status}`);
      }

      const json: PlanResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (isLoaded) {
      fetchPlan();
    }
  }, [isLoaded, fetchPlan]);

  if (!isLoaded || (loading && !data)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-slate-500 font-medium">
          {isHi ? "वायु गुणवत्ता और जोखिम संश्लेषण लोड हो रहा है..." : "Synthesizing air quality & exposure model..."}
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">
          {isHi ? "डेटा लोड करने में असमर्थ" : "Unable to Load Dashboard"}
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
        <button
          type="button"
          onClick={fetchPlan}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
        >
          {isHi ? "पुनः प्रयास करें" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isHi ? "वायु बुद्धिमत्ता और जोखिम डैशबोर्ड" : "Air Intelligence & Household Exposure"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile.location.city} ({profile.location.areaLabel ?? "Urban Center"}) •{" "}
            {isHi ? "स्वचालित दैनिक सुरक्षा विश्लेषण" : "Automated Winter Smog Decision Support"}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPlan}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs self-start sm:self-auto transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>{isHi ? "ताज़ा करें" : "Refresh"}</span>
        </button>
      </div>

      {data && (
        <>
          <FallbackBanner
            isAirFallback={data.environmentalContext.isDemoFallback}
            isAiFallback={data.aiFallback}
            lang={lang}
          />

          <AirObservationCard
            observation={data.environmentalContext.currentObservation}
            forecastPoints={data.environmentalContext.hourlyForecast}
            lang={lang}
          />

          <HourlyDiurnalChart
            points={data.environmentalContext.hourlyForecast}
            lang={lang}
          />

          <MemberExposureGrid
            members={profile.members}
            baselineHouseholdMean={data.baselineHouseholdMean}
            baselinePeakVulnerable={data.baselinePeakVulnerable}
            peakVulnerableRole={data.peakVulnerableMemberRole}
            lang={lang}
          />

          <PlanSynthesisCard
            explanation={data.explanation}
            evaluatedInterventions={data.evaluatedInterventions}
            aiFallback={data.aiFallback}
            lang={lang}
          />
        </>
      )}
    </div>
  );
}
