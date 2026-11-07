import { describe, expect, it } from "vitest";
import { inferEventType, resolveEventType } from "../src/lib/eventType";
import { eventRequestBody } from "../src/lib/google";
import { buildDayTimeline, tipForEvent } from "../src/lib/timeline";

const YEAR = Array.from({ length: 365 }, (_, i) => new Date(2026, 0, 1 + i, 12));

describe("event types", () => {
  it("keeps a valid stored type and infers otherwise", () => {
    expect(resolveEventType("finance", "Lunch")).toBe("finance");
    expect(resolveEventType("party", "Gym session")).toBe("gym");
    expect(resolveEventType(undefined, "Team sync")).toBe("meeting");
    expect(inferEventType("Dinner with Sam")).toBe("other");
  });

  it("tags Google events so the type survives a reload", () => {
    const body = eventRequestBody({
      summary: "Leg day",
      type: "gym",
      start: "2026-10-30T07:00:00",
      end: "2026-10-30T08:00:00",
      timeZone: "Asia/Kolkata",
    });
    expect(body.extendedProperties.private).toEqual({ satro: "true", satroType: "gym" });
    expect(body.description).toBe("Created by Satro Calendar · type=gym");
    expect(body.start).toEqual({ dateTime: "2026-10-30T07:00:00", timeZone: "Asia/Kolkata" });
    expect(body).not.toHaveProperty("conferenceData");
  });

  it("asks for a Meet link only when wanted", () => {
    const body = eventRequestBody({ summary: "Pitch", start: "a", end: "b", withMeet: true });
    expect(body).toHaveProperty("conferenceData.createRequest.conferenceSolutionKey.type", "hangoutsMeet");
  });
});

describe("M4 tips on real days", () => {
  it("shows Great time for gym on a Body's ready day", () => {
    const hits = YEAR.flatMap((date) => {
      const tl = buildDayTimeline(date, ["health"]);
      const chip = tl.chips.find((c) => c.keywordId === "body-ready");
      return chip ? [tipForEvent(tl, { startHour: chip.startHour, type: "gym" })] : [];
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((t) => t.pattern === "lean-in")).toBe(true);
    for (const t of hits.filter((h) => h.pattern === "lean-in")) {
      expect(t.leanInTips).toContain("Body's ready");
    }
  });

  it("always goes gentle for finance starting in Breather time", () => {
    for (const date of YEAR) {
      const tl = buildDayTimeline(date);
      const tip = tipForEvent(tl, { startHour: tl.rahuKaal.startHour, type: "finance" });
      expect(tip.pattern).toBe("keep-in-mind");
      expect(tip.keepInMind.length).toBeGreaterThan(0);
    }
  });
});
