import { describe, it, expect } from "vitest";
import { normalizeMemberSchedule } from "@/lib/exposure/schedule";
import { Activity } from "@/lib/schemas";

describe("Schedule Normalization & Conservation", () => {
  it("conserves 24.0 hours for an empty activity list by filling indoor_rest", () => {
    const slots = normalizeMemberSchedule([]);
    expect(slots).toHaveLength(24);

    let total = 0;
    for (const slot of slots) {
      const slotSum = slot.activities.reduce((s, a) => s + a.fraction, 0);
      expect(slotSum).toBeCloseTo(1.0, 5);
      total += slotSum;
      expect(slot.activities[0]?.type).toBe("indoor_rest");
    }
    expect(total).toBeCloseTo(24.0, 5);
  });

  it("properly splits overnight spans crossing midnight (22:00 to 06:00)", () => {
    const sleepActivity: Activity = {
      id: "act-sleep",
      memberId: "m1",
      type: "indoor_rest",
      startTime: "22:00",
      endTime: "06:00",
      indoor: true,
    };

    const slots = normalizeMemberSchedule([sleepActivity]);
    expect(slots[22]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[23]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[0]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[5]?.activities.some((a) => a.activityId === "act-sleep")).toBe(true);
    expect(slots[6]?.activities.some((a) => a.activityId === "act-sleep")).toBe(false);
  });

  it("handles sub-hour commute durations accurately with gap fill", () => {
    const commute: Activity = {
      id: "act-commute",
      memberId: "m1",
      type: "work",
      startTime: "08:15",
      endTime: "08:45",
      indoor: false,
      transportMode: "two_wheeler",
    };

    const slots = normalizeMemberSchedule([commute]);
    const slot8 = slots[8];
    expect(slot8).toBeDefined();

    const commuteSlice = slot8?.activities.find((a) => a.activityId === "act-commute");
    const gapSlice = slot8?.activities.find((a) => a.activityId === "gap-fill");

    expect(commuteSlice?.fraction).toBeCloseTo(0.5, 5);
    expect(gapSlice?.fraction).toBeCloseTo(0.5, 5);
  });
});
