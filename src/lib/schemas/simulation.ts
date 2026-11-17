import { z } from "zod";
import { HouseholdProfileSchema, ActivitySchema } from "./household";
import { InterventionCategorySchema, InconvenienceLevelSchema } from "./interventions";

export const PersonalProtectionResultSchema = z.object({
  baselineHouseholdMean: z.number(),
  projectedHouseholdMean: z.number(),
  baselinePeakVulnerable: z.number(),
  projectedPeakVulnerable: z.number(),
  deltaPeakExposureProxy: z.number(),
  relativeReductionPercentRange: z.tuple([z.number(), z.number()]),
  confidence: z.enum(["high", "medium", "low"]),
});

export const EnvironmentalContributionResultSchema = z.object({
  privateVehicleKmAvoidedPerDay: z.number().min(0),
  indoorCombustionSourceReduced: z.boolean(),
  summary: z.string(),
});

export const PracticalityResultSchema = z.object({
  estimatedCostInr: z.number().min(0),
  timeImpactMinutesPerDay: z.number(),
  inconvenienceLevel: InconvenienceLevelSchema,
  withinHouseholdConstraints: z.boolean(),
  mapsDirectionsUrl: z.string().url().optional(),
});

export const EvaluatedInterventionSchema = z.object({
  interventionId: z.string(),
  title: z.string(),
  description: z.string(),
  category: InterventionCategorySchema,
  personalProtection: PersonalProtectionResultSchema,
  environmentalContribution: EnvironmentalContributionResultSchema,
  practicality: PracticalityResultSchema,
  evidence: z.array(
    z.object({
      id: z.string(),
      sourceTitle: z.string(),
      claimSummary: z.string(),
      limitations: z.string(),
    })
  ),
  assumptions: z.array(z.string()),
});

export const SimulateRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  selectedInterventionIds: z.array(z.string()).default([]),
  activityOverrides: z.array(ActivitySchema).optional(),
});

export const SimulationResultSchema = z.object({
  counterfactualProfile: HouseholdProfileSchema,
  evaluatedInterventions: z.array(EvaluatedInterventionSchema),
  combinedPersonalProtection: PersonalProtectionResultSchema,
  combinedEnvironmentalContribution: EnvironmentalContributionResultSchema,
  combinedPracticality: PracticalityResultSchema,
  assumptions: z.array(z.string()),
});

export type PersonalProtectionResult = z.infer<typeof PersonalProtectionResultSchema>;
export type EnvironmentalContributionResult = z.infer<typeof EnvironmentalContributionResultSchema>;
export type PracticalityResult = z.infer<typeof PracticalityResultSchema>;
export type EvaluatedIntervention = z.infer<typeof EvaluatedInterventionSchema>;
export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;
export type SimulationResult = z.infer<typeof SimulationResultSchema>;
