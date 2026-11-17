import { z } from "zod";

export const LocationSchema = z.object({
  city: z.string().min(2).max(60).regex(/^[a-zA-Z\s.-]+$/),
  areaLabel: z.string().min(2).max(100).optional(),
  latitude: z.number().min(-90).max(90).default(28.6139),
  longitude: z.number().min(-180).max(180).default(77.209),
});

export const MemberCategorySchema = z.enum(["child", "adult", "older_adult"]);
export const OutdoorSensitivitySchema = z.enum(["standard", "higher"]);

export const MemberSchema = z.object({
  id: z.string().min(1),
  roleLabel: z.string().min(1).max(50),
  category: MemberCategorySchema,
  outdoorSensitivity: OutdoorSensitivitySchema,
});

export const TimeStringSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const ActivityTypeSchema = z.enum([
  "school",
  "work",
  "cooking",
  "exercise",
  "indoor_rest",
  "errands",
]);

export const TransportModeSchema = z.enum([
  "two_wheeler",
  "car",
  "public_transit",
  "walk_cycle",
  "none",
]);

export const ActivitySchema = z.object({
  id: z.string().min(1),
  memberId: z.string().min(1),
  type: ActivityTypeSchema,
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  indoor: z.boolean(),
  transportMode: TransportModeSchema.optional(),
  commuteDistanceKm: z.number().min(0).max(150).optional(),
  originLabel: z.string().max(100).optional(),
  destinationLabel: z.string().max(100).optional(),
});

export const VentilationLevelSchema = z.enum(["low", "moderate", "good"]);
export const CookingFuelSchema = z.enum(["lpg", "electric_induction", "solid_fuel"]);

export const HomeEnvironmentSchema = z.object({
  ventilation: VentilationLevelSchema,
  cookingFuel: CookingFuelSchema,
  hasOutdoorExhaust: z.boolean(),
  hasAirPurifier: z.boolean(),
  usesIncenseOrCoils: z.boolean(),
});

export const ConstraintsSchema = z.object({
  dailyBudgetInr: z.number().min(0),
  maxExtraTimeMinutesPerDay: z.number().min(0),
  preferredLanguage: z.enum(["en", "hi"]).default("en"),
  nonNegotiableActivityIds: z.array(z.string()).default([]),
});

export const HouseholdProfileSchema = z.object({
  location: LocationSchema,
  members: z.array(MemberSchema).min(1),
  activities: z.array(ActivitySchema),
  home: HomeEnvironmentSchema,
  constraints: ConstraintsSchema,
});

export type Location = z.infer<typeof LocationSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type HomeEnvironment = z.infer<typeof HomeEnvironmentSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;
