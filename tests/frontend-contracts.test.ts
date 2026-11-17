import { describe, it, expect, beforeEach, vi } from "vitest";
import { HouseholdProfileSchema } from "@/lib/schemas/household";
import {
  DEFAULT_DELHI_PROFILE,
  loadHouseholdProfile,
  saveHouseholdProfile,
  resetHouseholdProfile,
  STORAGE_KEY,
} from "@/lib/storage/profile-store";

describe("Frontend Storage & Contracts", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });

    vi.stubGlobal("window", {
      localStorage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it("validates DEFAULT_DELHI_PROFILE against HouseholdProfileSchema", () => {
    const parsed = HouseholdProfileSchema.safeParse(DEFAULT_DELHI_PROFILE);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.location.city).toBe("Delhi");
      expect(parsed.data.members.length).toBe(3);
      expect(parsed.data.constraints.preferredLanguage).toBe("en");
      expect(parsed.data.constraints.nonNegotiableActivityIds).toContain("act-school");
    }
  });

  it("returns DEFAULT_DELHI_PROFILE when localStorage is empty", () => {
    const loaded = loadHouseholdProfile();
    expect(loaded).toEqual(DEFAULT_DELHI_PROFILE);
  });

  it("saves and loads a valid profile correctly", () => {
    const modified = {
      ...DEFAULT_DELHI_PROFILE,
      constraints: {
        ...DEFAULT_DELHI_PROFILE.constraints,
        preferredLanguage: "hi" as const,
      },
    };
    saveHouseholdProfile(modified);
    const loaded = loadHouseholdProfile();
    expect(loaded.constraints.preferredLanguage).toBe("hi");
  });

  it("falls back to DEFAULT_DELHI_PROFILE when localStorage contains malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{ invalid-json");
    const loaded = loadHouseholdProfile();
    expect(loaded).toEqual(DEFAULT_DELHI_PROFILE);
  });

  it("falls back to DEFAULT_DELHI_PROFILE when localStorage schema validation fails", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ invalid: "data" }));
    const loaded = loadHouseholdProfile();
    expect(loaded).toEqual(DEFAULT_DELHI_PROFILE);
  });

  it("resets profile to default preset", () => {
    const modified = {
      ...DEFAULT_DELHI_PROFILE,
      location: { ...DEFAULT_DELHI_PROFILE.location, city: "Gurugram" },
    };
    saveHouseholdProfile(modified);
    expect(loadHouseholdProfile().location.city).toBe("Gurugram");

    resetHouseholdProfile();
    expect(loadHouseholdProfile().location.city).toBe("Delhi");
  });
});
