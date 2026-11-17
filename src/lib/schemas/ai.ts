import { z } from "zod";
import { HouseholdProfileSchema } from "./household";
import { EnvironmentalContextSchema } from "./air";
import { EvaluatedInterventionSchema } from "./simulation";

export const RecommendationCardSchema = z.object({
  interventionId: z.string(),
  recommendationText: z.string(),
  threePillarJustification: z.object({
    protection: z.string(),
    contribution: z.string(),
    practicality: z.string(),
  }),
});

export const PlanExplanationSchema = z.object({
  headline: z.string(),
  executiveSummary: z.string(),
  vulnerableMemberAdvice: z.string(),
  householdRecommendations: z.array(RecommendationCardSchema),
  airQualityObservationSummary: z.string(),
  assumptionsAndCaveats: z.array(z.string()),
});

export const PlanResponseSchema = z.object({
  environmentalContext: EnvironmentalContextSchema,
  baselineHouseholdMean: z.number(),
  baselinePeakVulnerable: z.number(),
  peakVulnerableMemberRole: z.string(),
  evaluatedInterventions: z.array(EvaluatedInterventionSchema),
  explanation: PlanExplanationSchema,
  aiFallback: z.boolean().default(false),
});

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(1000),
});

export const ChatRequestSchema = z.object({
  profile: HouseholdProfileSchema,
  message: z.string().trim().min(1).max(500),
  history: z.array(ChatTurnSchema).default([]),
});

export const ChatActionCardSchema = z.object({
  actionId: z.string(),
  title: z.string(),
  description: z.string(),
  impactSummary: z.string(),
  selectedInterventionIds: z.array(z.string()).optional(),
});

export const ChatResponseSchema = z.object({
  response: z.string(),
  actionCards: z.array(ChatActionCardSchema).default([]),
  toolsUsed: z.array(z.string()).default([]),
  aiFallback: z.boolean().default(false),
});

export type RecommendationCard = z.infer<typeof RecommendationCardSchema>;
export type PlanExplanation = z.infer<typeof PlanExplanationSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;
export type ChatTurn = z.infer<typeof ChatTurnSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatActionCard = z.infer<typeof ChatActionCardSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
