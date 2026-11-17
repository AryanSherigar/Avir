import { describe, it, expect } from "vitest";
import {
  calculateActivityDuration,
  formatHourAndFraction,
  findCleanestWindowStartHour,
  shiftActivitiesToCleanestWindow,
} from "../src/lib/simulation/time-shift";
import demoAir from "../data/demo-air-quality.json";
import { Activity } from "../src/lib/schemas/household";
import { HourlyForecastPoint } from "../src/lib/schemas/air";

describe("Simulation Time-Shift Optimizer", () => {
  describe("calculateActivityDuration", () => {
    it("calculates standard daytime duration", () => {
      expect(calculateActivityDuration("06:00", "07:30")).toBe(1.5);
      expect(calculateActivityDuration("08:00", "14:00")).toBe(6.0);
      expect(calculateActivityDuration("09:15", "10:45")).toBe(1.5);
    });

    it("calculates overnight duration correctly", () => {
      expect(calculateActivityDuration("22:00", "02:00")).toBe(4.0);
      expect(calculateActivityDuration("23:30", "00:30")).toBe(1.0);
      expect(calculateActivityDuration("21:00", "06:00")).toBe(9.0);
    });

    it("handles zero duration when start and end are equal", () => {
      expect(calculateActivityDuration("08:00", "08:00")).toBe(0.0);
    });
  });

  describe("formatHourAndFraction", () => {
    it("formats whole and fractional hours to HH:MM", () => {
      expect(formatHourAndFraction(14)).toBe("14:00");
      expect(formatHourAndFraction(0)).toBe("00:00");
      expect(formatHourAndFraction(1.5)).toBe("01:30");
      expect(formatHourAndFraction(7.25)).toBe("07:15");
      expect(formatHourAndFraction(23.75)).toBe("23:45");
    });

    it("handles 24-hour wrap-around cleanly", () => {
      expect(formatHourAndFraction(24)).toBe("00:00");
      expect(formatHourAndFraction(25.5)).toBe("01:30");
    });
  });

  describe("findCleanestWindowStartHour", () => {
    it("finds the lowest PM2.5 trough hour in diurnal forecast for 1-hour window", () => {
      const startHour = findCleanestWindowStartHour(demoAir.hourlyForecast, 1.0);
      // In demo data, hour 14 has lowest PM2.5 (145 µg/m³)
      expect(startHour).toBe(14);
    });

    it("finds optimal window for 2-hour duration", () => {
      const startHour = findCleanestWindowStartHour(demoAir.hourlyForecast, 2.0);
      // Hours 14-15 average (145 + 155)/2 = 150 µg/m³
      expect(startHour).toBe(14);
    });

    it("handles overnight clean window wrap-around", () => {
      const overnightCleanForecast: HourlyForecastPoint[] = Array.from({ length: 24 }, (_, i) => ({
        hourIndex: i,
        isoTime: `2026-11-17T${String(i).padStart(2, "0")}:00:00Z`,
        pm25: (i === 23 || i === 0) ? 50 : 300,
        pm10: 400,
      }));

      const startHour = findCleanestWindowStartHour(overnightCleanForecast, 2.0);
      // Window starting at 23 spans hours 23 (50) and 0 (50) -> average 50 µg/m³
      // Any other window includes at least one 300 µg/m³ hour
      expect(startHour).toBe(23);
    });
  });

  describe("shiftActivitiesToCleanestWindow", () => {
    it("shifts movable activities matching target types to cleanest window", () => {
      const activities: Activity[] = [
        {
          id: "act-exercise",
          memberId: "m1",
          type: "exercise",
          startTime: "06:00",
          endTime: "07:00",
          indoor: false,
        },
      ];

      const shifted = shiftActivitiesToCleanestWindow(
        activities,
        ["exercise"],
        demoAir.hourlyForecast,
        []
      );

      expect(shifted).toHaveLength(1);
      expect(shifted[0]?.startTime).toBe("14:00");
      expect(shifted[0]?.endTime).toBe("15:00");
      expect(shifted[0]?.type).toBe("exercise");
    });

    it("STRICT INVARIANT: never shifts non-negotiable activities", () => {
      const activities: Activity[] = [
        {
          id: "act-school",
          memberId: "m1",
          type: "school",
          startTime: "07:30",
          endTime: "14:00",
          indoor: true,
        },
      ];

      const shifted = shiftActivitiesToCleanestWindow(
        activities,
        ["school"],
        demoAir.hourlyForecast,
        ["act-school"] // locked by non-negotiable ID!
      );

      expect(shifted[0]?.startTime).toBe("07:30");
      expect(shifted[0]?.endTime).toBe("14:00");
    });

    it("does not shift activities whose type is not in targetTypes", () => {
      const activities: Activity[] = [
        {
          id: "act-cooking",
          memberId: "m1",
          type: "cooking",
          startTime: "19:00",
          endTime: "20:00",
          indoor: true,
        },
      ];

      const shifted = shiftActivitiesToCleanestWindow(
        activities,
        ["exercise"],
        demoAir.hourlyForecast,
        []
      );

      expect(shifted[0]?.startTime).toBe("19:00");
      expect(shifted[0]?.endTime).toBe("20:00");
    });

    it("correctly handles mixed list with locked, unshifted, and shifted activities", () => {
      const activities: Activity[] = [
        {
          id: "act-run",
          memberId: "m1",
          type: "exercise",
          startTime: "06:00",
          endTime: "07:30",
          indoor: false,
        },
        {
          id: "act-work",
          memberId: "m1",
          type: "work",
          startTime: "09:00",
          endTime: "17:00",
          indoor: true,
        },
        {
          id: "act-locked-errand",
          memberId: "m1",
          type: "errands",
          startTime: "10:00",
          endTime: "11:00",
          indoor: false,
        },
      ];

      const shifted = shiftActivitiesToCleanestWindow(
        activities,
        ["exercise", "errands"],
        demoAir.hourlyForecast,
        ["act-locked-errand"]
      );

      // act-run: duration 1.5h, cleanest start is 14:00, end is 15:30
      expect(shifted[0]?.id).toBe("act-run");
      expect(shifted[0]?.startTime).toBe("14:00");
      expect(shifted[0]?.endTime).toBe("15:30");

      // act-work: not in targetTypes -> unchanged
      expect(shifted[1]?.id).toBe("act-work");
      expect(shifted[1]?.startTime).toBe("09:00");
      expect(shifted[1]?.endTime).toBe("17:00");

      // act-locked-errand: in targetTypes but non-negotiable -> strictly locked
      expect(shifted[2]?.id).toBe("act-locked-errand");
      expect(shifted[2]?.startTime).toBe("10:00");
      expect(shifted[2]?.endTime).toBe("11:00");
    });
  });
});
