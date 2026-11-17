import { Activity, ActivityType } from "../schemas/household";
import { HourlyForecastPoint } from "../schemas/air";

function parseTimeToHours(hhmm: string): number {
  const [hourStr, minStr] = hhmm.split(":");
  const hours = parseInt(hourStr ?? "0", 10);
  const minutes = parseInt(minStr ?? "0", 10);
  return hours + minutes / 60;
}

export function calculateActivityDuration(startTime: string, endTime: string): number {
  const start = parseTimeToHours(startTime);
  const end = parseTimeToHours(endTime);
  return end >= start ? end - start : 24.0 - start + end;
}

export function formatHourAndFraction(hourFloat: number): string {
  const totalMinutes = Math.round((((hourFloat % 24) + 24) % 24) * 60) % 1440;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

function computeWindowAverage(
  pmByHour: Map<number, number>,
  startHour: number,
  windowLength: number
): number {
  let sum = 0;
  for (let i = 0; i < windowLength; i++) {
    const hour = (startHour + i) % 24;
    sum += pmByHour.get(hour) ?? 0;
  }
  return sum / windowLength;
}

export function findCleanestWindowStartHour(
  hourlyForecast: HourlyForecastPoint[],
  durationHours: number
): number {
  const pmByHour = new Map<number, number>();
  for (const point of hourlyForecast) {
    pmByHour.set(point.hourIndex, point.pm25);
  }

  const windowLength = Math.max(1, Math.ceil(durationHours));
  let bestStartHour = 0;
  let lowestAveragePm = Number.POSITIVE_INFINITY;

  for (let hour = 0; hour < 24; hour++) {
    const avg = computeWindowAverage(pmByHour, hour, windowLength);
    if (avg < lowestAveragePm) {
      lowestAveragePm = avg;
      bestStartHour = hour;
    }
  }

  return bestStartHour;
}

function shiftSingleActivity(
  act: Activity,
  targetTypes: ActivityType[],
  hourlyForecast: HourlyForecastPoint[],
  nonNegotiableIds: string[]
): Activity {
  if (nonNegotiableIds.includes(act.id) || !targetTypes.includes(act.type)) {
    return { ...act };
  }

  const duration = calculateActivityDuration(act.startTime, act.endTime);
  const bestHour = findCleanestWindowStartHour(hourlyForecast, duration);

  return {
    ...act,
    startTime: formatHourAndFraction(bestHour),
    endTime: formatHourAndFraction(bestHour + duration),
  };
}

export function shiftActivitiesToCleanestWindow(
  activities: Activity[],
  targetTypes: ActivityType[],
  hourlyForecast: HourlyForecastPoint[],
  nonNegotiableIds: string[]
): Activity[] {
  return activities.map((act) =>
    shiftSingleActivity(act, targetTypes, hourlyForecast, nonNegotiableIds)
  );
}
