import { describe, expect, it } from "vitest";
import {
  RAIL_HEIGHT,
  ROW,
  breatherWindow,
  eventBox,
  hourTop,
  layoutChips,
  layoutEvents,
  startsInBreather,
} from "../src/lib/rail";
import { rahuKaalWindow, scoreDay } from "../src/lib/scoring";
import { buildDayTimeline } from "../src/lib/timeline";

const ev = (id: string, start: string, end: string) => ({
  id,
  start: `2026-10-30T${start}:00`,
  end: `2026-10-30T${end}:00`,
});

describe("eventBox", () => {
  it("puts 12:30 at the right offset", () => {
    expect(eventBox("2026-10-30T12:30:00", "2026-10-30T13:30:00").top).toBe(6.5 * ROW);
  });

  it("keeps a late event running to midnight", () => {
    const box = eventBox("2026-10-30T22:00:00", "2026-10-31T00:00:00");
    expect(box.height).toBe(2 * ROW - 4);
    expect(box.top + box.height).toBeLessThanOrEqual(RAIL_HEIGHT);
  });

  it("parks all-day and early events at the top", () => {
    expect(eventBox("2026-10-30", "2026-10-31")).toMatchObject({ startHour: 6, top: 0 });
    expect(eventBox("2026-10-30T04:00:00", "2026-10-30T05:00:00").top).toBe(0);
  });

  it("clamps an event that starts before 6", () => {
    const box = eventBox("2026-10-30T05:00:00", "2026-10-30T08:00:00");
    expect(box.top).toBe(0);
    expect(box.height).toBe(2 * ROW - 4);
  });

  it("gives very short events a readable block", () => {
    const box = eventBox("2026-10-30T10:00:00", "2026-10-30T10:05:00");
    expect(box.height).toBeGreaterThanOrEqual(26);
    expect(box.compact).toBe(true);
    expect(eventBox("2026-10-30T10:00:00", "2026-10-30T11:00:00").compact).toBe(false);
  });

  it("copes with a missing end", () => {
    expect(eventBox("2026-10-30T10:00:00", "").height).toBeGreaterThanOrEqual(26);
  });

  it("keeps an event near midnight on the rail", () => {
    const box = eventBox("2026-10-30T23:50:00", "2026-10-30T23:55:00");
    expect(box.top + box.height).toBeLessThanOrEqual(RAIL_HEIGHT + 26);
  });
});

describe("layoutEvents", () => {
  it("leaves separate events full width", () => {
    const out = layoutEvents([ev("a", "09:00", "10:00"), ev("b", "11:00", "12:00")]);
    expect(out.map((o) => o.lanes)).toEqual([1, 1]);
  });

  it("puts overlapping events side by side", () => {
    const out = layoutEvents([ev("a", "09:00", "11:00"), ev("b", "09:30", "10:30")]);
    expect(out.map((o) => o.lane)).toEqual([0, 1]);
    expect(out.every((o) => o.lanes === 2 && !o.extra)).toBe(true);
  });

  it("moves a third overlapping event behind the +N button", () => {
    const out = layoutEvents([
      ev("a", "09:00", "11:00"),
      ev("b", "09:30", "10:30"),
      ev("c", "10:00", "10:15"),
    ]);
    expect(out.map((o) => o.extra)).toEqual([false, false, true]);
    expect(out.every((o) => o.lanes === 2)).toBe(true);
    expect(new Set(out.map((o) => o.cluster)).size).toBe(1);
  });

  it("reuses a lane when an event has ended", () => {
    const out = layoutEvents([
      ev("a", "09:00", "12:00"),
      ev("b", "09:00", "10:00"),
      ev("c", "10:30", "11:00"),
    ]);
    expect(out.find((o) => o.event.id === "c")?.lane).toBe(1);
    expect(out[0].lanes).toBe(2);
  });
});

describe("layoutChips", () => {
  it("never overlaps chips and keeps them on the rail, all year", () => {
    for (let i = 0; i < 365; i++) {
      const { chips } = buildDayTimeline(new Date(2026, 0, 1 + i, 12), ["career", "rest"]);
      const tops = layoutChips(chips).map((c) => c.top);
      for (let j = 1; j < tops.length; j++) expect(tops[j] - tops[j - 1]).toBeGreaterThanOrEqual(22);
      expect(Math.max(...tops) + 22).toBeLessThanOrEqual(RAIL_HEIGHT);
    }
  });

  it("starts each chip at its hour when there is room", () => {
    const [first] = layoutChips([{ startHour: 9 }]);
    expect(first.top).toBe(hourTop(9) + 4);
  });
});

describe("breatherWindow", () => {
  it("matches the engine on every weekday", () => {
    for (let i = 0; i < 7; i++) {
      const day = new Date(2026, 9, 26 + i, 12);
      const rk = rahuKaalWindow(scoreDay(day).weekday);
      expect(breatherWindow(day)).toEqual({ startHour: rk.startHour, endHour: rk.endHour });
    }
  });

  it("spots events that start inside it", () => {
    const friday = new Date(2026, 9, 30, 12);
    expect(startsInBreather("2026-10-30T11:00:00", friday)).toBe(true);
    expect(startsInBreather("2026-10-30T12:00:00", friday)).toBe(false);
    expect(startsInBreather("2026-10-30", friday)).toBe(false);
  });
});
