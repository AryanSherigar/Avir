import React from "react";
import { Users, AlertCircle, HeartPulse, ShieldAlert } from "lucide-react";
import { Member } from "@/lib/schemas/household";

interface MemberExposureGridProps {
  members: Member[];
  baselineHouseholdMean: number;
  baselinePeakVulnerable: number;
  peakVulnerableRole: string;
  lang?: "en" | "hi";
}

export function MemberExposureGrid({
  members,
  baselineHouseholdMean,
  baselinePeakVulnerable,
  peakVulnerableRole,
  lang = "en",
}: MemberExposureGridProps) {
  const isHi = lang === "hi";

  const maxVal = Math.max(baselinePeakVulnerable * 1.25, 400);

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" aria-hidden="true" />
            {isHi ? "परिवार के सदस्यों का व्यक्तिगत जोखिम (24-घंटे का एक्सपोजर)" : "Household Member Exposure Proxies"}
          </h2>
          <p className="text-xs text-slate-500">
            {isHi
              ? "अनुमानित संचयी जोखिम बैंड [निम्न, केंद्रीय, उच्च] µg/m³·h में"
              : "24-hour cumulative exposure proxy bands [low, central, high] in µg/m³·h"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            {isHi ? "औसत घरेलू स्तर:" : "Household Mean:"}{" "}
            <span className="font-bold">{baselineHouseholdMean} µg/m³·h</span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {members.map((member) => {
          const isPeak = member.roleLabel === peakVulnerableRole || member.outdoorSensitivity === "higher";
          const central = isPeak ? baselinePeakVulnerable : baselineHouseholdMean;
          const low = Math.round(central * 0.85);
          const high = Math.round(central * 1.15);
          const percent = Math.min(100, Math.round((central / maxVal) * 100));

          return (
            <div
              key={member.id}
              className={`p-3.5 rounded-lg border transition ${
                isPeak ? "bg-red-50/60 border-red-200" : "bg-slate-50/60 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{member.roleLabel}</span>
                  <span className="text-xs text-slate-400 capitalize">({member.category.replace("_", " ")})</span>
                  {isPeak && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      <HeartPulse className="w-3 h-3 text-red-600" />
                      {isHi ? "शीर्ष संवेदनशील सदस्य" : "Peak Vulnerable"}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900">{central}</span>
                  <span className="text-[10px] text-slate-500 ml-1">µg/m³·h</span>
                  <span className="text-[10px] text-slate-400 block">
                    [{low} – {high}]
                  </span>
                </div>
              </div>

              {/* Progress Bar with Uncertainty Band */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden relative">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    isPeak ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {isPeak && (
                <p className="text-[11px] text-red-700 mt-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  {isHi
                    ? "उच्च संवेदनशीलता: सुबह की पीक स्मॉग विंडो में बाहरी गतिविधियों को न्यूनतम रखें।"
                    : "Prioritize mask protection and indoors rest during the morning inversion spike."}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>
          {isHi
            ? "पारदर्शी अनिश्चितता: यह अनुमानित संचयी जोखिम प्रॉक्सी है; यह कोई नैदानिक ​​फेफड़ों की खुराक या चिकित्सा निदान नहीं है।"
            : "Transparent Uncertainty: Relative exposure proxy estimate; does not constitute clinical lung dose or medical diagnosis."}
        </span>
      </div>
    </section>
  );
}
