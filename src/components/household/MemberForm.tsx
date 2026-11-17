"use client";

import React, { useState } from "react";
import { User, Plus, Trash2, HeartPulse } from "lucide-react";
import { Member } from "@/lib/schemas/household";

interface MemberFormProps {
  members: Member[];
  onChange: (members: Member[]) => void;
  lang?: "en" | "hi";
}

export function MemberForm({ members, onChange, lang = "en" }: MemberFormProps) {
  const isHi = lang === "hi";
  const [newRole, setNewRole] = useState("");
  const [newCategory, setNewCategory] = useState<Member["category"]>("adult");
  const [newSensitivity, setNewSensitivity] = useState<Member["outdoorSensitivity"]>("standard");

  const handleAddMember = () => {
    if (!newRole.trim()) return;
    const newMember: Member = {
      id: `m-${Date.now()}`,
      roleLabel: newRole.trim(),
      category: newCategory,
      outdoorSensitivity: newSensitivity,
    };
    onChange([...members, newMember]);
    setNewRole("");
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) return; // Keep at least one
    onChange(members.filter((m) => m.id !== id));
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" aria-hidden="true" />
            {isHi ? "परिवार के सदस्य" : "Household Members"}
          </h2>
          <p className="text-xs text-slate-500">
            {isHi
              ? "आयु वर्ग और वायु संवेदनशीलता निर्धारित करें"
              : "Specify age groups and air vulnerability for personalized protection"}
          </p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {members.length} {isHi ? "सदस्य" : "members"}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {member.roleLabel.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{member.roleLabel}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="capitalize">{member.category.replace("_", " ")}</span>
                  <span>•</span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      member.outdoorSensitivity === "higher" ? "text-amber-700 font-medium" : "text-slate-600"
                    }`}
                  >
                    {member.outdoorSensitivity === "higher" && <HeartPulse className="w-3 h-3 text-amber-600" />}
                    {member.outdoorSensitivity === "higher"
                      ? isHi
                        ? "उच्च संवेदनशीलता"
                        : "Higher Sensitivity"
                      : isHi
                        ? "मानक"
                        : "Standard"}
                  </span>
                </div>
              </div>
            </div>
            {members.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveMember(member.id)}
                className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                aria-label={`Remove ${member.roleLabel}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">{isHi ? "नया सदस्य जोड़ें" : "Add New Member"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder={isHi ? "नाम / भूमिका (उदा. दादाजी)" : "Role Label (e.g. Grandparent)"}
            className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Member["category"])}
            className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
          >
            <option value="child">{isHi ? "बच्चा (Child)" : "Child"}</option>
            <option value="adult">{isHi ? "वयस्क (Adult)" : "Adult"}</option>
            <option value="older_adult">{isHi ? "वरिष्ठ (Older Adult)" : "Older Adult"}</option>
          </select>
          <div className="flex gap-2">
            <select
              value={newSensitivity}
              onChange={(e) => setNewSensitivity(e.target.value as Member["outdoorSensitivity"])}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white flex-1"
            >
              <option value="standard">{isHi ? "मानक" : "Standard"}</option>
              <option value="higher">{isHi ? "उच्च" : "Higher"}</option>
            </select>
            <button
              type="button"
              onClick={handleAddMember}
              disabled={!newRole.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium flex items-center justify-center shrink-0"
              aria-label="Confirm Add Member"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
