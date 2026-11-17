import { HouseholdProfile } from "../schemas/household";
import { EnvironmentalContext } from "../schemas/air";
import { calculateHouseholdExposure } from "../exposure/calculate";
import { simulateRoutine } from "../simulation/compare";
import { findCleanestWindowStartHour, formatHourAndFraction } from "../simulation/time-shift";

export const CHAT_TOOL_DECLARATIONS = [
  {
    name: "get_household_exposure_breakdown",
    description: "Returns per-member exposure totals, peak vulnerable member, and household mean exposure proxy.",
    parameters: {
      type: "OBJECT",
      properties: {
        memberId: { type: "STRING", description: "Optional member ID to inspect specifically" },
      },
    },
  },
  {
    name: "simulate_custom_routine",
    description: "Simulates an intervention plan returning the 3 pillars: Personal Protection, Environmental Contribution, and Practicality.",
    parameters: {
      type: "OBJECT",
      properties: {
        selectedInterventionIds: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "List of intervention IDs from catalogue to activate",
        },
      },
      required: ["selectedInterventionIds"],
    },
  },
  {
    name: "get_cleanest_outdoor_windows",
    description: "Scans the 24-hour outdoor forecast to locate the window with the lowest average PM2.5 concentration.",
    parameters: {
      type: "OBJECT",
      properties: {
        durationHours: { type: "NUMBER", description: "Duration in hours of the desired outdoor window" },
      },
      required: ["durationHours"],
    },
  },
];

function parseInterventionIds(args: Record<string, unknown>): string[] {
  if (!Array.isArray(args.selectedInterventionIds)) {
    return [];
  }
  return args.selectedInterventionIds.filter(
    (item): item is string => typeof item === "string"
  );
}

function parseDurationHours(args: Record<string, unknown>): number {
  if (typeof args.durationHours === "number" && !Number.isNaN(args.durationHours)) {
    return args.durationHours;
  }
  return 1;
}

function handleExposureBreakdown(profile: HouseholdProfile, context: EnvironmentalContext) {
  const result = calculateHouseholdExposure(profile, context.hourlyForecast);
  const members = Object.values(result.memberExposures).map((m) => ({
    memberId: m.memberId,
    role: m.roleLabel,
    isVulnerable: m.isVulnerable,
    centralExposureProxy: Math.round(m.centralEstimate),
  }));

  return {
    householdMean: Math.round(result.householdMeanExposure.centralEstimate),
    peakVulnerableMember: {
      role: result.peakVulnerableMember.roleLabel,
      exposure: Math.round(result.peakVulnerableMember.exposure.centralEstimate),
    },
    members,
  };
}

function calculateWindowAveragePm25(
  forecast: EnvironmentalContext["hourlyForecast"],
  startHour: number,
  duration: number
): number {
  let sumPm = 0;
  for (let i = 0; i < duration; i++) {
    const hour = (startHour + i) % 24;
    const pt = forecast.find((p) => p.hourIndex === hour);
    sumPm += pt?.pm25 ?? 0;
  }
  return Math.round(sumPm / duration);
}

function handleCleanestWindow(context: EnvironmentalContext, durationHours: number) {
  const duration = Math.max(1, Math.min(8, Math.round(durationHours || 1)));
  const startHour = findCleanestWindowStartHour(context.hourlyForecast, duration);
  const endHour = (startHour + duration) % 24;
  const averagePm25 = calculateWindowAveragePm25(context.hourlyForecast, startHour, duration);

  return {
    startHour: formatHourAndFraction(startHour),
    endHour: formatHourAndFraction(endHour),
    durationHours: duration,
    averagePm25,
  };
}

function handleSimulateRoutine(
  profile: HouseholdProfile,
  context: EnvironmentalContext,
  args: Record<string, unknown>
) {
  const ids = parseInterventionIds(args);
  const sim = simulateRoutine(profile, ids, context.hourlyForecast);
  return {
    personalProtection: sim.combinedPersonalProtection,
    environmentalContribution: sim.combinedEnvironmentalContribution,
    practicality: sim.combinedPracticality,
  };
}

function executeToolByName(
  name: string,
  args: Record<string, unknown>,
  profile: HouseholdProfile,
  context: EnvironmentalContext
): string {
  if (name === "get_household_exposure_breakdown") {
    return JSON.stringify(handleExposureBreakdown(profile, context));
  }
  if (name === "simulate_custom_routine") {
    return JSON.stringify(handleSimulateRoutine(profile, context, args));
  }
  if (name === "get_cleanest_outdoor_windows") {
    const duration = parseDurationHours(args);
    return JSON.stringify(handleCleanestWindow(context, duration));
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

export function createChatToolExecutor(
  profile: HouseholdProfile,
  context: EnvironmentalContext
): (name: string, args: Record<string, unknown>) => Promise<string> {
  return async (name: string, args: Record<string, unknown>): Promise<string> => {
    try {
      return executeToolByName(name, args, profile, context);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tool execution failed";
      return JSON.stringify({ error: msg });
    }
  };
}
