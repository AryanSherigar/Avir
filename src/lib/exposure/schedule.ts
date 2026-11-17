import { Activity, ActivityTypeSchema } from "../schemas/household";
import { z } from "zod";

type ActivityType = z.infer<typeof ActivityTypeSchema>;

export interface ActivityFraction {
  activityId: string;
  type: ActivityType;
  fraction: number;
  indoor: boolean;
  transportMode?: Activity["transportMode"];
}

export interface NormalizedHourSlot {
  hourIndex: number;
  activities: ActivityFraction[];
}

interface TimeSpan {
  activityId: string;
  type: ActivityType;
  start: number;
  end: number;
  indoor: boolean;
  transportMode?: Activity["transportMode"];
}

function parseTimeToHours(hhmm: string): number {
  const parts = hhmm.split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours + minutes / 60;
}

function splitOvernightActivity(act: Activity): TimeSpan[] {
  const start = parseTimeToHours(act.startTime);
  const end = parseTimeToHours(act.endTime);

  if (end < start) {
    return [
      {
        activityId: act.id,
        type: act.type,
        start,
        end: 24.0,
        indoor: act.indoor,
        transportMode: act.transportMode,
      },
      {
        activityId: act.id,
        type: act.type,
        start: 0.0,
        end,
        indoor: act.indoor,
        transportMode: act.transportMode,
      },
    ];
  }

  return [
    {
      activityId: act.id,
      type: act.type,
      start,
      end,
      indoor: act.indoor,
      transportMode: act.transportMode,
    },
  ];
}

function calculateSlotOverlap(
  span: TimeSpan,
  slotStart: number,
  slotEnd: number
): number {
  return Math.max(0, Math.min(slotEnd, span.end) - Math.max(slotStart, span.start));
}

function extractHourFractions(
  spans: TimeSpan[],
  hourIndex: number
): ActivityFraction[] {
  const slotStart = hourIndex;
  const slotEnd = hourIndex + 1;
  const fractions: ActivityFraction[] = [];

  for (const span of spans) {
    const overlap = calculateSlotOverlap(span, slotStart, slotEnd);
    if (overlap > 0.0001) {
      fractions.push({
        activityId: span.activityId,
        type: span.type,
        fraction: overlap,
        indoor: span.indoor,
        transportMode: span.transportMode,
      });
    }
  }

  return fractions;
}

const EPSILON = 0.0001;

function balanceHourSlot(
  hourIndex: number,
  activities: ActivityFraction[]
): NormalizedHourSlot {
  const totalAllocated = activities.reduce((sum, a) => sum + a.fraction, 0);

  if (totalAllocated > 1.0) {
    return {
      hourIndex,
      activities: activities.map((a) => ({
        ...a,
        fraction: a.fraction / totalAllocated,
      })),
    };
  }

  if (totalAllocated < 1.0 - EPSILON) {
    return {
      hourIndex,
      activities: [
        ...activities,
        {
          activityId: "gap-fill",
          type: "indoor_rest",
          fraction: 1.0 - totalAllocated,
          indoor: true,
        },
      ],
    };
  }

  return {
    hourIndex,
    activities,
  };
}

export function normalizeMemberSchedule(
  activities: Activity[]
): NormalizedHourSlot[] {
  const spans = activities.flatMap(splitOvernightActivity);
  const slots: NormalizedHourSlot[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const fractions = extractHourFractions(spans, hour);
    slots.push(balanceHourSlot(hour, fractions));
  }

  return slots;
}
