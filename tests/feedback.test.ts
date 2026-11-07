import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  daySummary,
  learnedAdjustments,
  learningInsight,
  parseFeedback,
  ratingForTag,
  upsertFeedback,
  type FeedbackEntry,
} from "../src/lib/feedback";
import { scoreDay } from "../src/lib/scoring";
import { domainScoresFromDay } from "../src/lib/timeline";

const db = vi.hoisted(() => ({ entries: [] as unknown[] }));
vi.mock("@/lib/store", () => ({
  readProfile: () => ({ preferredDomains: ["career"], birthDate: "" }),
  readFeedback: () => db.entries,
  writeFeedback: (e: unknown[]) => {
    db.entries = e;
  },
}));
import { GET, POST } from "../src/app/api/feedback/route";

const entry = (over: Partial<FeedbackEntry> = {}): FeedbackEntry => ({
  id: "fb",
  eventId: `e${Math.random()}`,
  eventSummary: "Gym",
  date: "2026-10-30",
  rating: "up",
  tags: [],
  createdAt: "",
  eventType: "gym",
  startHour: 7,
  domain: "health",
  pattern: "lean-in",
  ...over,
});
const many = (n: number, over: Partial<FeedbackEntry>) => Array.from({ length: n }, () => entry(over));
const post = (body: unknown) =>
  POST(new NextRequest("http://localhost/api/feedback", { method: "POST", body: JSON.stringify(body) }));

describe("feedback input", () => {
  it("never turns a negative tag into a thumbs up", () => {
    expect(ratingForTag("draining")).toBe("down");
    expect(ratingForTag("off vibe")).toBe("down");
    expect(ratingForTag("on track")).toBe("up");
  });

  it("validates, trims and caps", () => {
    const ok = parseFeedback({
      eventId: "a", rating: "up", date: "2026-10-30", eventSummary: "Gym",
      note: "x".repeat(400), tags: ["a", "a", "b", "c", "d", "e", "f"],
    });
    expect("entry" in ok && ok.entry.note?.length).toBe(280);
    expect("entry" in ok && ok.entry.tags).toHaveLength(5);
    expect("entry" in ok && ok.entry.eventType).toBe("gym");
    expect(parseFeedback({ eventId: "a", rating: "meh", date: "2026-10-30" })).toHaveProperty("error");
    expect(parseFeedback({ rating: "up", date: "2026-10-30" })).toHaveProperty("error");
    expect(parseFeedback({ eventId: "a", rating: "up", date: "soon" })).toHaveProperty("error");
  });

  it("replaces an earlier rating for the same event", () => {
    const first = entry({ eventId: "a", rating: "up" });
    const second = entry({ eventId: "a", rating: "down" });
    expect(upsertFeedback([first, entry({ eventId: "b" })], second).filter((e) => e.eventId === "a")).toEqual([second]);
  });
});

describe("learning", () => {
  it("does nothing below three ratings", () => {
    expect(learnedAdjustments(many(2, { rating: "down", tags: ["off vibe"] }))).toEqual({});
  });

  it("lowers an area after three off-vibe great-time tips", () => {
    expect(learnedAdjustments(many(3, { rating: "down", tags: ["off vibe"] }))).toEqual({ health: -0.5 });
  });

  it("raises an area after three good-timing ratings", () => {
    expect(learnedAdjustments(many(3, { tags: ["good timing"] }))).toEqual({ health: 0.5 });
  });

  it("caps the change at 1.5 either way", () => {
    expect(learnedAdjustments(many(30, { rating: "down", tags: ["off vibe"] }))).toEqual({ health: -1.5 });
    expect(learnedAdjustments(many(30, { tags: ["good timing"] }))).toEqual({ health: 1.5 });
  });

  it("ignores ratings on tips that weren't great-time tips", () => {
    expect(learnedAdjustments(many(5, { rating: "down", tags: ["off vibe"], pattern: "neutral" }))).toEqual({});
  });

  it("feeds into the day's scores", () => {
    const day = scoreDay(new Date(2026, 9, 30, 12));
    const base = domainScoresFromDay(day, []).find((d) => d.domain === "health")!;
    const lowered = domainScoresFromDay(day, [], { health: -1 }).find((d) => d.domain === "health")!;
    expect(lowered.score).toBeCloseTo(Math.max(0, base.score - 1), 5);
  });

  it("shares an insight only after five ratings", () => {
    expect(learningInsight(many(4, {}))).toBeNull();
    expect(learningInsight(many(5, {}))).toBe("Satro is learning: you rate morning gym sessions highly.");
    expect(learningInsight(many(5, { rating: "down" }))).toBeNull();
  });

  it("names the right part of the day and event", () => {
    expect(learningInsight(many(5, { eventType: "meeting", startHour: 18 }))).toContain("evening meetings");
  });

  it("summarises the day", () => {
    expect(daySummary([entry({ tags: ["on track"] }), entry()])).toBe("2 events rated · 1 on track");
    expect(daySummary([entry()])).toBe("1 event rated");
  });
});

describe("/api/feedback", () => {
  beforeEach(() => {
    db.entries = [];
  });

  it("persists, and re-rating replaces the earlier entry", async () => {
    const body = { eventId: "a", eventSummary: "Gym", date: "2026-10-30", startHour: 7 };
    expect((await post({ ...body, rating: "up" })).status).toBe(200);
    await post({ ...body, rating: "down", tags: ["draining"] });
    const { entries, summary } = await (await GET(new NextRequest("http://localhost/api/feedback?date=2026-10-30"))).json();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ rating: "down", tags: ["draining"], domain: "health" });
    expect(entries[0].pattern).toBeTruthy();
    expect(summary).toBe("1 event rated");
  });

  it("rejects bad input", async () => {
    expect((await post({ eventId: "a", rating: "nah", date: "2026-10-30" })).status).toBe(400);
    expect(db.entries).toEqual([]);
  });
});
