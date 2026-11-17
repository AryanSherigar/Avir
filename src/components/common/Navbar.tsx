"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wind, Home, Sliders, MessageSquare, Globe } from "lucide-react";
import { useHousehold } from "@/lib/storage";

export function Navbar() {
  const pathname = usePathname();
  const { profile, updateProfile } = useHousehold();
  const lang = profile.constraints.preferredLanguage;
  const isHindi = lang === "hi";

  const toggleLanguage = () => {
    const nextLang = isHindi ? "en" : "hi";
    updateProfile((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        preferredLanguage: nextLang,
      },
    }));
  };

  const navItems = [
    { href: "/", label: isHindi ? "डैशबोर्ड" : "Dashboard", icon: Wind },
    { href: "/onboarding", label: isHindi ? "परिवार प्रोफाइल" : "Household", icon: Home },
    { href: "/simulator", label: isHindi ? "रूटीन सिम्युलेटर" : "Simulator", icon: Sliders },
    { href: "/assistant", label: isHindi ? "असिस्टेंट" : "Assistant", icon: MessageSquare },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-blue-700 transition">
            अ
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">Avir</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                अविर
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">Smart Air Adaptation & Navigation</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} aria-hidden="true" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition"
            aria-label={`Switch language to ${isHindi ? "English" : "Hindi"}`}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>{isHindi ? "English" : "हिंदी"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
