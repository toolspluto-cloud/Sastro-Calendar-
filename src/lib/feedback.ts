import { resolveEventType, type EventType } from "./eventType";
import type { TipPattern } from "./timeline";

/** "How did it go?" entries and what Satro learns from them. Safe for the client. */
export const FEEDBACK_TAGS = ["on track", "draining", "good timing", "off vibe"] as const;
const NEGATIVE_TAGS = ["draining", "off vibe"];
const MAX_NOTE = 280;
const MAX_TAGS = 5;

const STEP_EVERY = 3; // ratings needed for one nudge
const STEP = 0.5;
const MAX_ADJUST = 1.5;
const INSIGHT_MIN_ENTRIES = 5;
const INSIGHT_MIN_UPS = 2;

export type FeedbackEntry = {
  id: string;
  eventId: string;
  eventSummary: string;
  date: string;
  rating: "up" | "down";
  tags: string[];
  note?: string;
  createdAt: string;
  eventType: EventType;
  startHour?: number;
  domain?: string;
  pattern?: TipPattern;
};

/** A tag tapped before any thumb implies the rating, so "draining" never saves as a thumbs up. */
export function ratingForTag(tag: string): "up" | "down" {
  return NEGATIVE_TAGS.includes(tag) ? "down" : "up";
}

export function parseFeedback(
  body: Record<string, unknown>
): { entry: FeedbackEntry } | { error: string } {
  if (!body.eventId) return { error: "Need eventId and rating (up|down)" };
  if (body.rating !== "up" && body.rating !== "down") {
    return { error: "rating must be up or down" };
  }
  const summary = String(body.eventSummary || "");
  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "date must be YYYY-MM-DD" };
  const startHour = Number(body.startHour);
  return {
    entry: {
      id: `fb_${Date.now()}`,
      eventId: String(body.eventId),
      eventSummary: summary,
      date,
      rating: body.rating,
      tags: Array.isArray(body.tags)
        ? Array.from(new Set(body.tags.map(String))).slice(0, MAX_TAGS)
        : [],
      note: typeof body.note === "string" && body.note.trim() ? body.note.slice(0, MAX_NOTE) : undefined,
      createdAt: new Date().toISOString(),
      eventType: resolveEventType(body.eventType, summary),
      ...(Number.isFinite(startHour) && body.startHour != null ? { startHour } : {}),
    },
  };
}

/** Re-rating replaces the earlier entry for that event. */
export function upsertFeedback(entries: FeedbackEntry[], entry: FeedbackEntry) {
  return [...entries.filter((e) => e.eventId !== entry.eventId), entry];
}

/** Nudges per life area from "great time" tips that did or didn't feel right. */
export function learnedAdjustments(entries: FeedbackEntry[]) {
  const misses: Record<string, number> = {};
  const hits: Record<string, number> = {};
  for (const e of entries) {
    if (e.pattern !== "lean-in" || !e.domain) continue;
    if (e.rating === "down" && e.tags.includes("off vibe")) misses[e.domain] = (misses[e.domain] ?? 0) + 1;
    if (e.rating === "up" && e.tags.includes("good timing")) hits[e.domain] = (hits[e.domain] ?? 0) + 1;
  }
  const adjustments: Record<string, number> = {};
  for (const domain of new Set([...Object.keys(misses), ...Object.keys(hits)])) {
    const steps =
      Math.floor((hits[domain] ?? 0) / STEP_EVERY) - Math.floor((misses[domain] ?? 0) / STEP_EVERY);
    const nudge = Math.max(-MAX_ADJUST, Math.min(MAX_ADJUST, steps * STEP));
    if (nudge !== 0) adjustments[domain] = nudge;
  }
  return adjustments;
}

const TYPE_WORDS: Record<EventType, string> = {
  gym: "gym sessions",
  meeting: "meetings",
  finance: "money plans",
  doctor: "health visits",
  other: "plans",
};

function partOfDay(hour: number) {
  if (hour < 12) return "morning";
  return hour < 17 ? "afternoon" : "evening";
}

/** A short "here's what I've noticed" line, once there's enough to go on. */
export function learningInsight(entries: FeedbackEntry[]): string | null {
  if (entries.length < INSIGHT_MIN_ENTRIES) return null;
  const tally = new Map<string, { up: number; down: number }>();
  for (const e of entries) {
    if (e.startHour == null) continue;
    const key = `${partOfDay(e.startHour)} ${TYPE_WORDS[e.eventType]}`;
    const t = tally.get(key) ?? { up: 0, down: 0 };
    t[e.rating] += 1;
    tally.set(key, t);
  }
  const best = Array.from(tally.entries())
    .filter(([, t]) => t.up >= INSIGHT_MIN_UPS && t.up > t.down)
    .sort(([, a], [, b]) => b.up - b.down - (a.up - a.down))[0];
  return best ? `Satro is learning: you rate ${best[0]} highly.` : null;
}

export function daySummary(entries: FeedbackEntry[]) {
  const onTrack = entries.filter((e) => e.tags.includes("on track")).length;
  const rated = `${entries.length} ${entries.length === 1 ? "event" : "events"} rated`;
  return onTrack ? `${rated} · ${onTrack} on track` : rated;
}
