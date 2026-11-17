"use client";

import React, { useState } from "react";
import { Clock, Lock, Unlock, Plus, Trash2 } from "lucide-react";
import { Activity, Member } from "@/lib/schemas/household";

interface ActivityTimelineProps {
  activities: Activity[];
  members: Member[];
  nonNegotiableIds: string[];
  onActivitiesChange: (activities: Activity[]) => void;
  onLocksChange: (lockedIds: string[]) => void;
  lang?: "en" | "hi";
}

const ACTIVITY_TYPES = [
  { value: "indoor_rest", labelEn: "Rest / Sleep", labelHi: "विश्राम / नींद" },
  { value: "cooking", labelEn: "Cooking", labelHi: "खाना बनाना" },
  { value: "work", labelEn: "Work / Office", labelHi: "काम / कार्यालय" },
  { value: "school", labelEn: "School / Study", labelHi: "स्कूल / पढ़ाई" },
  { value: "exercise", labelEn: "Exercise / Outdoor Walk", labelHi: "व्यायाम / सैर" },
  { value: "errands", labelEn: "Errands / Market", labelHi: "बाजार / काम" },
];

export function ActivityTimeline({
  activities,
  members,
  nonNegotiableIds,
  onActivitiesChange,
  onLocksChange,
  lang = "en",
}: ActivityTimelineProps) {
  const isHi = lang === "hi";
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id ?? "");

  const activeMemberId = members.some((m) => m.id === selectedMemberId)
    ? selectedMemberId
    : (members[0]?.id ?? "");

  const memberActivities = activities.filter((a) => a.memberId === activeMemberId);

  const toggleLock = (activityId: string) => {
    const isLocked = nonNegotiableIds.includes(activityId);
    const updated = isLocked
      ? nonNegotiableIds.filter((id) => id !== activityId)
      : [...nonNegotiableIds, activityId];
    onLocksChange(updated);
  };

  const handleRemoveActivity = (id: string) => {
    onActivitiesChange(activities.filter((a) => a.id !== id));
    onLocksChange(nonNegotiableIds.filter((lockedId) => lockedId !== id));
  };

  const handleAddActivity = () => {
    if (!activeMemberId) return;
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      memberId: activeMemberId,
      type: "work",
      startTime: "09:00",
      endTime: "17:00",
      indoor: true,
    };
    onActivitiesChange([...activities, newAct]);
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
            {isHi ? "दैनिक दिनचर्या और गैर-परक्राम्य समय" : "Daily Routine & Non-Negotiable Locks"}
          </h2>
          <p className="text-xs text-slate-500">
            {isHi
              ? "ताले (लॉक) पर क्लिक करके उन गतिविधियों को फ्रीज करें जिन्हें बदला नहीं जा सकता"
              : "Lock essential routines (school, shift work) so the simulator will never shift them"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddActivity}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold self-start sm:self-auto transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {isHi ? "गतिविधि जोड़ें" : "Add Activity"}
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 overflow-x-auto">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMemberId(m.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              activeMemberId === m.id
                ? "bg-blue-600 text-white font-semibold"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {m.roleLabel}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {memberActivities.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {isHi ? "इस सदस्य के लिए कोई गतिविधि दर्ज नहीं है।" : "No activities recorded for this member."}
          </p>
        ) : (
          memberActivities.map((act) => {
            const isLocked = nonNegotiableIds.includes(act.id);
            return (
              <div
                key={act.id}
                className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 transition ${
                  isLocked ? "bg-amber-50/50 border-amber-200" : "bg-slate-50/70 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleLock(act.id)}
                    className={`p-1.5 rounded-md transition ${
                      isLocked
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                    }`}
                    title={isLocked ? "Locked (Non-negotiable)" : "Unlocked (Flexible for shift)"}
                    aria-label={isLocked ? "Unlock activity" : "Lock activity as non-negotiable"}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 capitalize">
                        {ACTIVITY_TYPES.find((t) => t.value === act.type)?.[isHi ? "labelHi" : "labelEn"] ?? act.type}
                      </span>
                      {isLocked && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                          {isHi ? "लॉक" : "LOCKED"}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {act.startTime} – {act.endTime} • {act.indoor ? (isHi ? "घर के अंदर" : "Indoor") : (isHi ? "बाहर" : "Outdoor")}
                      {act.transportMode && ` • ${act.transportMode.replace("_", " ")}`}
                      {act.commuteDistanceKm && ` (${act.commuteDistanceKm} km)`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveActivity(act.id)}
                  className="text-slate-400 hover:text-red-600 p-1 rounded"
                  aria-label="Remove activity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
