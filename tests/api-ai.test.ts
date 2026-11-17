import { describe, it, expect } from "vitest";
import { POST as planHandler } from "../src/app/api/plan/route";
import { POST as chatHandler } from "../src/app/api/chat/route";
import { NextRequest } from "next/server";
import { HouseholdProfile, HouseholdProfileSchema } from "../src/lib/schemas/household";
import { PlanResponseSchema, ChatResponseSchema } from "../src/lib/schemas/ai";

const defaultProfile: HouseholdProfile = HouseholdProfileSchema.parse({
  householdName: "Sharma Family",
  location: {
    city: "Delhi",
    areaLabel: "Anand Vihar",
    latitude: 28.6139,
    longitude: 77.209,
  },
  members: [
    { id: "m-child", roleLabel: "Child", category: "child", outdoorSensitivity: "higher" },
    { id: "m-senior", roleLabel: "Grandfather", category: "older_adult", outdoorSensitivity: "higher" },
    { id: "m-adult", roleLabel: "Parent", category: "adult", outdoorSensitivity: "standard" },
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
    {
      id: "a-walk",
      memberId: "m-senior",
      type: "exercise",
      startTime: "06:00",
      endTime: "07:00",
      indoor: false,
    },
    {
      id: "a-commute",
      memberId: "m-adult",
      type: "work",
      startTime: "08:30",
      endTime: "09:30",
      indoor: false,
      transportMode: "two_wheeler",
      commuteDistanceKm: 12,
    },
  ],
  home: {
    ventilation: "moderate",
    cookingFuel: "lpg",
    hasOutdoorExhaust: false,
    hasAirPurifier: false,
    usesIncenseOrCoils: true,
  },
  constraints: {
    dailyBudgetInr: 500,
    maxExtraTimeMinutesPerDay: 45,
    preferredLanguage: "en",
    nonNegotiableActivityIds: [],
  },
});

describe("AI API Route Handlers", () => {
  describe("POST /api/plan", () => {
    it("returns 200 with valid PlanResponse", async () => {
      const req = new NextRequest("http://localhost:3000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: defaultProfile }),
      });

      const res = await planHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.explanation).toBeDefined();
      expect(json.environmentalContext).toBeDefined();
      expect(json.evaluatedInterventions).toBeDefined();
      expect(json.baselineHouseholdMean).toBeGreaterThan(0);
      expect(json.baselinePeakVulnerable).toBeGreaterThan(0);
      expect(json.peakVulnerableMemberRole).toBeDefined();
      expect(json.aiFallback).toBe(true);

      const parsed = PlanResponseSchema.safeParse(json);
      expect(parsed.success).toBe(true);
    });

    it("returns 400 on invalid profile", async () => {
      const req = new NextRequest("http://localhost:3000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { invalid: true } }),
      });

      const res = await planHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Invalid payload");
      expect(json.issues).toBeDefined();
    });

    it("returns 400 on empty request body", async () => {
      const req = new NextRequest("http://localhost:3000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await planHandler(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on malformed JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await planHandler(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });

  describe("POST /api/chat", () => {
    it("returns 200 with valid ChatResponse", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: defaultProfile,
          message: "How can we protect grandfather today?",
        }),
      });

      const res = await chatHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.response).toBeDefined();
      expect(json.aiFallback).toBe(true);

      const parsed = ChatResponseSchema.safeParse(json);
      expect(parsed.success).toBe(true);
    });

    it("returns 400 on missing message", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: defaultProfile,
        }),
      });

      const res = await chatHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("Invalid chat payload");
      expect(json.issues).toBeDefined();
    });

    it("returns 400 on empty string message", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: defaultProfile,
          message: "",
        }),
      });

      const res = await chatHandler(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on malformed JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await chatHandler(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });
});
