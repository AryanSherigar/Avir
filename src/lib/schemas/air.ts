import { z } from "zod";

export const DataSourceSchema = z.enum(["cpcb", "open_meteo_current", "demo"]);
export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const CurrentObservationSchema = z.object({
  stationName: z.string().min(1),
  city: z.string().min(1),
  source: DataSourceSchema,
  observedAt: z.string().min(1),
  pm25: z.number().nullable(),
  pm10: z.number().nullable(),
  no2: z.number().nullable(),
  officialNaqi: z.number().nullable(),
  confidence: ConfidenceLevelSchema,
  distanceKm: z.number().min(0).optional(),
});

export const HourlyForecastPointSchema = z.object({
  hourIndex: z.number().int().min(0).max(23),
  isoTime: z.string().min(1),
  pm25: z.number().min(0),
  pm10: z.number().min(0),
  windSpeedKmh: z.number().min(0).optional(),
});

export const EnvironmentalContextSchema = z.object({
  currentObservation: CurrentObservationSchema,
  hourlyForecast: z.array(HourlyForecastPointSchema).length(24),
  dataQualityWarnings: z.array(z.string()).default([]),
  isDemoFallback: z.boolean().default(false),
});

export type CurrentObservation = z.infer<typeof CurrentObservationSchema>;
export type HourlyForecastPoint = z.infer<typeof HourlyForecastPointSchema>;
export type EnvironmentalContext = z.infer<typeof EnvironmentalContextSchema>;
