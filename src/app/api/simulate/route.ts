import { NextRequest, NextResponse } from "next/server";
import { SimulateRequestSchema } from "@/lib/schemas/simulation";
import { simulateRoutine } from "@/lib/simulation";
import demoAir from "../../../../data/demo-air-quality.json";
import { HourlyForecastPoint } from "@/lib/schemas/air";

const hourlyForecast = demoAir.hourlyForecast as HourlyForecastPoint[];

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = SimulateRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { profile, selectedInterventionIds, activityOverrides } = parsed.data;
    const result = simulateRoutine(
      profile,
      selectedInterventionIds,
      hourlyForecast,
      activityOverrides
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal simulation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
