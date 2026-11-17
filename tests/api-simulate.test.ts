import { describe, it, expect } from "vitest";
import { POST } from "../src/app/api/simulate/route";
import { NextRequest } from "next/server";
import { HouseholdProfileSchema } from "../src/lib/schemas";

const validProfile = HouseholdProfileSchema.parse({
  location: { city: "Delhi", areaLabel: "Anand Vihar" },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
  ],
  activities: [
    {
      id: "a-school",
      memberId: "m-child",
      type: "school",
      startTime: "07:30",
      endTime: "14:00",
      indoor: true,
    },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: false,
  },
  constraints: {
    dailyBudgetInr: 100,
    maxExtraTimeMinutesPerDay: 30,
    preferredLanguage: "en",
    nonNegotiableActivityIds: [],
  },
});

describe("POST /api/simulate Route Handler", () => {
  it("returns 200 with typed simulation result on valid payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: validProfile,
        selectedInterventionIds: ["weatherstrip_windows"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.combinedPersonalProtection).toBeDefined();
    expect(data.combinedEnvironmentalContribution).toBeDefined();
    expect(data.combinedPracticality).toBeDefined();
    expect(data.evaluatedInterventions).toHaveLength(1);
    expect(data.counterfactualProfile).toBeDefined();
  });

  it("returns 400 on invalid payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid payload");
    expect(data.issues).toBeDefined();
  });
});
