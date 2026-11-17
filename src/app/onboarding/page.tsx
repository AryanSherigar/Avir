"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ArrowRight, Check } from "lucide-react";
import { useHousehold } from "@/lib/storage";
import { MemberForm } from "@/components/household/MemberForm";
import { ActivityTimeline } from "@/components/household/ActivityTimeline";
import { HomeEnvironmentForm } from "@/components/household/HomeEnvironmentForm";
import { ConstraintsForm } from "@/components/household/ConstraintsForm";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfile, resetProfile, isLoaded } = useHousehold();
  const [saved, setSaved] = useState(false);
  const lang = profile.constraints.preferredLanguage;
  const isHi = lang === "hi";

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-500 text-sm">
        {isHi ? "लोड हो रहा है..." : "Loading household profile..."}
      </div>
    );
  }

  const handleSaveAndProceed = () => {
    setSaved(true);
    setTimeout(() => {
      router.push("/");
    }, 400);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isHi ? "परिवार प्रोफाइल और दिनचर्या सेटअप" : "Household Profile & Routine Setup"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isHi
              ? "स्मार्ट वायु अनुकूलन और वास्तविक जोखिम मूल्यांकन के लिए अपने परिवार का विवरण कॉन्फ़िगर करें"
              : "Configure your household setup for hyper-local exposure estimation and deterministic simulation"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={resetProfile}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            {isHi ? "डिफ़ॉल्ट दिल्ली प्रीसेट" : "Reset to Delhi Preset"}
          </button>
          <button
            type="button"
            onClick={handleSaveAndProceed}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                {isHi ? "सहेज लिया!" : "Saved!"}
              </>
            ) : (
              <>
                <span>{isHi ? "सहेजें और डैशबोर्ड देखें" : "Save & Open Dashboard"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <MemberForm
        members={profile.members}
        onChange={(members) => updateProfile((p) => ({ ...p, members }))}
        lang={lang}
      />

      <ActivityTimeline
        activities={profile.activities}
        members={profile.members}
        nonNegotiableIds={profile.constraints.nonNegotiableActivityIds}
        onActivitiesChange={(activities) => updateProfile((p) => ({ ...p, activities }))}
        onLocksChange={(nonNegotiableActivityIds) =>
          updateProfile((p) => ({
            ...p,
            constraints: { ...p.constraints, nonNegotiableActivityIds },
          }))
        }
        lang={lang}
      />

      <HomeEnvironmentForm
        home={profile.home}
        onChange={(home) => updateProfile((p) => ({ ...p, home }))}
        lang={lang}
      />

      <ConstraintsForm
        constraints={profile.constraints}
        onChange={(constraints) => updateProfile((p) => ({ ...p, constraints }))}
        lang={lang}
      />
    </div>
  );
}
