import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEnvironmentalContext } from "@/lib/air-quality/normalize";

const AirQuerySchema = z.object({
  city: z.string().min(2).max(60).default("Delhi"),
  lat: z.coerce.number().min(-90).max(90).default(28.6139),
  lon: z.coerce.number().min(-180).max(180).default(77.209),
  areaLabel: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = AirQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters", issues: parsed.error.issues }, { status: 400 });
    }

    const { city, lat, lon, areaLabel } = parsed.data;
    const context = await getEnvironmentalContext(city, lat, lon, areaLabel);

    return NextResponse.json(context, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=60",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load air quality data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
