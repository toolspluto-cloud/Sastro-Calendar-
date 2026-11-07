import { describe, expect, it } from "vitest";
import {
  formatEventTime,
  formatEventTimeShort,
  isAllDayEvent,
  isValidTimeZone,
  wallClockIn,
  isSameLocalDay,
  localFractionalHour,
  localWallDateTime,
  parseEventDate,
} from "../src/lib/datetime";

describe("datetime", () => {
  it("reads floating times as local wall-clock", () => {
    const d = parseEventDate("2026-10-30T12:30:00");
    expect([d.getHours(), d.getMinutes()]).toEqual([12, 30]);
    expect(formatEventTime("2026-10-30T12:30:00")).toMatch(/12:30/);
  });

  it("shows 12:30 as afternoon, never 12:30 AM", () => {
    const label = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
      parseEventDate("2026-10-30T12:30:00")
    );
    expect(label).toContain("PM");
  });

  it("keeps offset times as true instants", () => {
    expect(parseEventDate("2026-10-30T07:00:00Z").toISOString()).toBe("2026-10-30T07:00:00.000Z");
    expect(parseEventDate("2026-10-30T12:30:00+05:30").toISOString()).toBe("2026-10-30T07:00:00.000Z");
  });

  it("treats date-only values as local all-day", () => {
    expect(isAllDayEvent("2026-10-30")).toBe(true);
    expect(formatEventTime("2026-10-30")).toBe("All day");
    expect(formatEventTimeShort("2026-10-30")).toBe("All day");
    expect(parseEventDate("2026-10-30").getHours()).toBe(0);
  });

  it("prints midnight as 00:00 in compact cells", () => {
    expect(formatEventTimeShort("2026-10-30T00:05:00")).toMatch(/^0?0:05$/);
  });

  it("places events by local hour and day", () => {
    expect(localFractionalHour("2026-10-30T12:30:00")).toBe(12.5);
    expect(isSameLocalDay("2026-10-30T23:59:00", new Date(2026, 9, 30, 1))).toBe(true);
    expect(isSameLocalDay("2026-10-31T00:00:00", new Date(2026, 9, 30, 23))).toBe(false);
  });

  it("builds wall-clock strings with no Z", () => {
    const wall = localWallDateTime(new Date(2026, 0, 5), "9:05");
    expect(wall).toBe("2026-01-05T09:05:00");
  });

  it("handles empty and invalid input", () => {
    expect(formatEventTime("")).toBe("");
    expect(formatEventTime("nope")).toBe("");
    expect(Number.isNaN(parseEventDate("").getTime())).toBe(true);
  });
});

describe("wallClockIn", () => {
  // 08:45 UTC on Sat 7 Nov 2026 is 2:15 PM in India and 12:45 AM in Los Angeles.
  const at = new Date(Date.UTC(2026, 10, 7, 8, 45, 30));

  it("reads as the user's wall-clock time, whatever the server zone", () => {
    const india = wallClockIn("Asia/Kolkata", at);
    expect([india.getDate(), india.getHours(), india.getMinutes(), india.getSeconds()]).toEqual([7, 14, 15, 30]);
    expect(india.getDay()).toBe(6);
    const la = wallClockIn("America/Los_Angeles", at);
    expect([la.getDate(), la.getHours(), la.getMinutes()]).toEqual([7, 0, 45]);
  });

  it("handles a day that has already changed for the user", () => {
    const auckland = wallClockIn("Pacific/Auckland", new Date(Date.UTC(2026, 10, 7, 20, 0)));
    expect([auckland.getDate(), auckland.getHours()]).toEqual([8, 9]);
  });

  it("keeps the given time for a missing or unknown zone", () => {
    expect(wallClockIn(undefined, at)).toBe(at);
    expect(wallClockIn("Mars/Olympus", at)).toBe(at);
  });

  it("validates zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
