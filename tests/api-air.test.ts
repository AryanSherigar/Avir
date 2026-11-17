import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/air/route";
import { NextRequest } from "next/server";
import { EnvironmentalContextSchema } from "../src/lib/schemas/air";

describe("GET /api/air Route Handler", () => {
  it("returns 200 with valid EnvironmentalContext for default Delhi coordinates", async () => {
    const req = new NextRequest("http://localhost:3000/api/air?city=Delhi&lat=28.6139&lon=77.2090");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = EnvironmentalContextSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=900");
  });

  it("returns 400 for invalid coordinate parameters", async () => {
    const req = new NextRequest("http://localhost:3000/api/air?lat=999");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("Invalid query parameters");
  });
});
