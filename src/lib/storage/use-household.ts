"use client";

import { useState, useEffect, useCallback } from "react";
import { HouseholdProfile } from "@/lib/schemas/household";
import {
  DEFAULT_DELHI_PROFILE,
  PROFILE_CHANGE_EVENT,
  loadHouseholdProfile,
  saveHouseholdProfile,
  resetHouseholdProfile,
} from "./profile-store";

export function useHousehold() {
  const [profile, setProfileState] = useState<HouseholdProfile>(DEFAULT_DELHI_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setProfileState(loadHouseholdProfile());
    setIsLoaded(true);

    const handleProfileChange = () => {
      setProfileState(loadHouseholdProfile());
    };

    window.addEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
    window.addEventListener("storage", handleProfileChange);

    return () => {
      window.removeEventListener(PROFILE_CHANGE_EVENT, handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, []);

  const setProfile = useCallback((newProfile: HouseholdProfile) => {
    saveHouseholdProfile(newProfile);
    setProfileState(newProfile);
  }, []);

  const updateProfile = useCallback((updater: (prev: HouseholdProfile) => HouseholdProfile) => {
    setProfileState((prev) => {
      const updated = updater(prev);
      saveHouseholdProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(() => {
    resetHouseholdProfile();
    setProfileState(DEFAULT_DELHI_PROFILE);
  }, []);

  return {
    profile,
    setProfile,
    updateProfile,
    resetProfile,
    isLoaded,
  };
}
