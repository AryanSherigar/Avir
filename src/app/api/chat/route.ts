import { NextRequest, NextResponse } from "next/server";
import { ChatRequestSchema, ChatResponse } from "@/lib/schemas/ai";
import { getEnvironmentalContext } from "@/lib/air-quality";
import { runChatLoop } from "@/lib/ai";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json();
    const parsed = ChatRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid chat payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { profile } = parsed.data;
    const { city, latitude, longitude, areaLabel } = profile.location;
    const context = await getEnvironmentalContext(city, latitude, longitude, areaLabel);
    const result: ChatResponse = await runChatLoop(parsed.data, context);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chat assistant failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
