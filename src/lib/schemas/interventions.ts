import { z } from "zod";
import { ActivityTypeSchema, TransportModeSchema, CookingFuelSchema } from "./household";

export const BilingualTextSchema = z.object({
  en: z.string().min(1),
  hi: z.string().min(1),
});

export const InterventionCategorySchema = z.enum([
  "exposure_reduction",
  "emission_reduction",
  "indoor_air",
  "schedule",
]);

export const InconvenienceLevelSchema = z.enum(["low", "medium", "high"]);

export const InterventionRuleSchema = z.object({
  id: z.string().min(1),
  title: BilingualTextSchema,
  description: BilingualTextSchema,
  category: InterventionCategorySchema,
  prerequisites: z.object({
    requiresActivityTypes: z.array(ActivityTypeSchema).optional(),
    applicableTransport: z.array(TransportModeSchema).optional(),
    applicableCookingFuel: z.array(CookingFuelSchema).optional(),
    requiresIncenseUse: z.boolean().optional(),
    requiresNoPurifier: z.boolean().optional(),
    requiresPurifier: z.boolean().optional(),
  }),
  effectModifiers: z.object({
    infiltrationMultiplier: z.number().positive().max(1.0).optional(),
    indoorSourceMultiplier: z.number().min(0).max(1.0).optional(),
    shiftActivityTypesToLowestPmWindow: z.array(ActivityTypeSchema).optional(),
    replaceTransportWith: z.literal("public_transit").optional(),
    ventilationWindowOnly: z.boolean().optional(),
  }),
  practicality: z.object({
    estimatedCostInr: z.number().min(0),
    timeImpactMinutesPerDay: z.number(),
    inconvenienceLevel: InconvenienceLevelSchema,
  }),
  evidenceRefs: z.array(z.string()),
});

export const EvidenceEntrySchema = z.object({
  id: z.string().min(1),
  sourceTitle: z.string().min(1),
  authorsOrAgency: z.string().min(1),
  year: z.number().int(),
  claimSummary: z.string().min(1),
  limitations: z.string().min(1),
  url: z.string().url().optional(),
});

export type InterventionRule = z.infer<typeof InterventionRuleSchema>;
export type EvidenceEntry = z.infer<typeof EvidenceEntrySchema>;
