import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { HouseholdProfileSchema } from "@/lib/schemas/household";
import { EnvironmentalContext } from "@/lib/schemas/air";
import { EvaluatedIntervention } from "@/lib/schemas/simulation";
import { PlanExplanation, PlanResponse } from "@/lib/schemas/ai";
import { HouseholdExposureResult } from "@/lib/exposure";
import { getEnvironmentalContext } from "@/lib/air-quality";
import { calculateHouseholdExposure } from "@/lib/exposure";
import { getApplicableInterventions, evaluateIntervention } from "@/lib/interventions";
import { generatePlanExplanation } from "@/lib/ai";

export const PlanRequestSchema = z.object({
  profile: HouseholdProfileSchema,
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

function buildPlanResponse(
  context: EnvironmentalContext,
  baseline: HouseholdExposureResult,
  evaluated: EvaluatedIntervention[],
  explanation: PlanExplanation,
  aiFallback: boolean
): PlanResponse {
  return {
    environmentalContext: context,
    baselineHouseholdMean: Math.round(baseline.householdMeanExposure.centralEstimate),
    baselinePeakVulnerable: Math.round(baseline.peakVulnerableMember.exposure.centralEstimate),
    peakVulnerableMemberRole: baseline.peakVulnerableMember.roleLabel,
    evaluatedInterventions: evaluated,
    explanation,
    aiFallback,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json();
    const parsed = PlanRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { profile } = parsed.data;
    const { city, latitude, longitude, areaLabel } = profile.location;
    const context = await getEnvironmentalContext(city, latitude, longitude, areaLabel);
    const baseline = calculateHouseholdExposure(profile, context.hourlyForecast);
    const applicable = getApplicableInterventions(profile);
    const evaluated = applicable.map((rule) =>
      evaluateIntervention(rule, profile, context.hourlyForecast)
    );

    const { explanation, aiFallback } = await generatePlanExplanation(
      profile,
      baseline,
      evaluated,
      context
    );

    const planResponse = buildPlanResponse(context, baseline, evaluated, explanation, aiFallback);
    return NextResponse.json(planResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Plan synthesis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
