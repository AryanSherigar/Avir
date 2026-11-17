import { ConfidenceLevelSchema } from "../schemas/air";
import { z } from "zod";

type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export interface ValidationResult {
  isValid: boolean;
  confidence: ConfidenceLevel;
  warnings: string[];
}

export function validateObservation(obs: {
  pm25: number | null;
  pm10: number | null;
  observedAt: string;
}): ValidationResult {
  if (obs.pm25 === null || obs.pm25 <= 0) {
    return { isValid: false, confidence: "low", warnings: ["Invalid non-positive PM2.5 reading"] };
  }

  if (obs.pm25 > 1500) {
    return { isValid: false, confidence: "low", warnings: ["PM2.5 exceeds physical threshold of 1500 µg/m³"] };
  }

  if (obs.pm10 !== null && obs.pm10 > 0 && obs.pm25 > obs.pm10 * 1.25) {
    return {
      isValid: false,
      confidence: "low",
      warnings: ["PM2.5 exceeds PM10 by more than 25% tolerance (sensor anomaly)"],
    };
  }

  return evaluateObservationFreshness(obs.observedAt);
}

function evaluateObservationFreshness(observedAt: string): ValidationResult {
  const ageMs = Date.now() - new Date(observedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours > 3) {
    return {
      isValid: true,
      confidence: "low",
      warnings: ["Station reading is older than 3 hours"],
    };
  }

  if (ageHours > 1) {
    return { isValid: true, confidence: "medium", warnings: [] };
  }

  return { isValid: true, confidence: "high", warnings: [] };
}
