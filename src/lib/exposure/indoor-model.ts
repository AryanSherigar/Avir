import { HomeEnvironment } from "../schemas/household";

export type InfiltrationBand = [number, number, number];

export interface IndoorConcentrationBand {
  low: number;
  central: number;
  high: number;
}

const BASE_INFILTRATION: Record<HomeEnvironment["ventilation"], InfiltrationBand> = {
  low: [0.45, 0.55, 0.65],
  moderate: [0.6, 0.7, 0.8],
  good: [0.75, 0.85, 0.95],
};

const COOKING_BASE_EMISSION: Record<HomeEnvironment["cookingFuel"], number> = {
  electric_induction: 5,
  lpg: 45,
  solid_fuel: 180,
};

const EXHAUST_RETENTION_FACTOR = 0.35;
const PURIFIER_INFILTRATION_FACTOR = 0.5;
const INCENSE_EMISSION_RATE = 35;

export function getInfiltrationBand(
  home: HomeEnvironment,
  infiltrationMultiplier: number = 1.0
): InfiltrationBand {
  const [low, central, high] = BASE_INFILTRATION[home.ventilation];
  const purifierFactor = home.hasAirPurifier ? PURIFIER_INFILTRATION_FACTOR : 1.0;
  return [
    low * purifierFactor * infiltrationMultiplier,
    central * purifierFactor * infiltrationMultiplier,
    high * purifierFactor * infiltrationMultiplier,
  ];
}

export function calculateIndoorSource(
  home: HomeEnvironment,
  hourIndex: number,
  isCooking: boolean
): number {
  let source = 0;

  if (isCooking) {
    const baseCooking = COOKING_BASE_EMISSION[home.cookingFuel];
    source += home.hasOutdoorExhaust ? baseCooking * EXHAUST_RETENTION_FACTOR : baseCooking;
  }

  if (home.usesIncenseOrCoils && hourIndex >= 18 && hourIndex <= 20) {
    source += INCENSE_EMISSION_RATE;
  }

  return source;
}

export function calculateIndoorConcentration(
  outdoorPm25: number,
  home: HomeEnvironment,
  hourIndex: number,
  isCooking: boolean,
  infiltrationMultiplier: number = 1.0
): IndoorConcentrationBand {
  const [fLow, fCentral, fHigh] = getInfiltrationBand(home, infiltrationMultiplier);
  const source = calculateIndoorSource(home, hourIndex, isCooking);

  return {
    low: fLow * outdoorPm25 + source,
    central: fCentral * outdoorPm25 + source,
    high: fHigh * outdoorPm25 + source,
  };
}
