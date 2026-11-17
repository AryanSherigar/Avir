import { HouseholdProfile, HouseholdProfileSchema } from "@/lib/schemas/household";

export const STORAGE_KEY = "avir_household_profile_v1";
export const PROFILE_CHANGE_EVENT = "avir:profile-updated";

export const DEFAULT_DELHI_PROFILE: HouseholdProfile = {
  location: {
    city: "Delhi",
    areaLabel: "Anand Vihar",
    latitude: 28.6139,
    longitude: 77.209,
  },
  members: [
    { id: "m-child", roleLabel: "Aarav (School Child)", category: "child", outdoorSensitivity: "higher" },
    { id: "m-commuter", roleLabel: "Vikram (Commuting Parent)", category: "adult", outdoorSensitivity: "standard" },
    { id: "m-senior", roleLabel: "Kamla Devi (Grandmother)", category: "older_adult", outdoorSensitivity: "higher" },
  ],
  activities: [
    {
      id: "act-sleep",
      memberId: "m-child",
      type: "indoor_rest",
      startTime: "21:30",
      endTime: "06:30",
      indoor: true,
    },
    {
      id: "act-school",
      memberId: "m-child",
      type: "school",
      startTime: "07:30",
      endTime: "14:00",
      indoor: true,
    },
    {
      id: "act-commute-morning",
      memberId: "m-commuter",
      type: "work",
      startTime: "08:15",
      endTime: "09:15",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
      originLabel: "Anand Vihar",
      destinationLabel: "Connaught Place",
    },
    {
      id: "act-commute-evening",
      memberId: "m-commuter",
      type: "work",
      startTime: "18:00",
      endTime: "19:00",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 15,
      originLabel: "Connaught Place",
      destinationLabel: "Anand Vihar",
    },
    {
      id: "act-cooking-lunch",
      memberId: "m-senior",
      type: "cooking",
      startTime: "11:30",
      endTime: "13:00",
      indoor: true,
    },
    {
      id: "act-cooking-dinner",
      memberId: "m-senior",
      type: "cooking",
      startTime: "19:00",
      endTime: "20:30",
      indoor: true,
    },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: true,
    hasAirPurifier: false,
    usesIncenseOrCoils: true,
  },
  constraints: {
    dailyBudgetInr: 250,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: ["act-school"],
  },
};

export function loadHouseholdProfile(): HouseholdProfile {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_DELHI_PROFILE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DELHI_PROFILE;
    const parsedJson = JSON.parse(raw);
    const validated = HouseholdProfileSchema.safeParse(parsedJson);
    if (validated.success) return validated.data;
  } catch {
    // Ignore JSON parse errors and return fallback
  }
  return DEFAULT_DELHI_PROFILE;
}

export function saveHouseholdProfile(profile: HouseholdProfile): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  const validated = HouseholdProfileSchema.safeParse(profile);
  if (!validated.success) return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated.data));
    window.dispatchEvent(new CustomEvent(PROFILE_CHANGE_EVENT, { detail: validated.data }));
    return true;
  } catch {
    return false;
  }
}

export function resetHouseholdProfile(): boolean {
  return saveHouseholdProfile(DEFAULT_DELHI_PROFILE);
}
