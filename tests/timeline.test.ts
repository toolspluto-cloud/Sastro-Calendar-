import { describe, expect, it } from "vitest";
import { inferEventType } from "../src/lib/eventType";
import { labelScore, rahuKaalWindow, scoreDay, syntheticPanchang } from "../src/lib/scoring";
import {
  buildDayTimeline,
  domainScoresFromDay,
  tipForEvent,
  todayCardSummary,
  type DayTimeline,
  type KeywordTone,
  type TimedChip,
} from "../src/lib/timeline";

const ALL_DOMAINS = [
  "career", "money", "health", "social", "romance",
  "focus", "travel", "family", "creativity", "rest",
];
// Noon local, so these stay on the intended day in any timezone.
const day = (iso: string) => new Date(`${iso}T12:00:00`);
// 2026-10-26 is a Monday.
const WEEK = [
  ["Monday", 7.5, 9], ["Tuesday", 15, 16.5], ["Wednesday", 12, 13.5], ["Thursday", 13.5, 15],
  ["Friday", 10.5, 12], ["Saturday", 9, 10.5], ["Sunday", 16.5, 18],
] as const;

function everyDayOf2026() {
  const out: Date[] = [];
  for (let i = 0; i < 365; i++) out.push(new Date(2026, 0, 1 + i, 12));
  return out;
}

describe("rahuKaalWindow", () => {
  it.each(WEEK)("%s matches the table", (weekday, start, end) => {
    const rk = rahuKaalWindow(weekday);
    expect([rk.startHour, rk.endHour]).toEqual([start, end]);
  });
});

describe("syntheticPanchang", () => {
  it("follows the day-of-year cycle", () => {
    const jan1 = syntheticPanchang(day("2026-01-01")); // dayOfYear 1
    expect(jan1).toMatchObject({ tithiNum: 1, paksha: "Shukla", tithiClass: "Nanda", karana: "Balava", yoga: "Shiva" });
    expect(syntheticPanchang(day("2026-01-15")).tithiClass).toBe("Purnima");
    expect(syntheticPanchang(day("2026-01-16")).paksha).toBe("Krishna");
    expect(syntheticPanchang(day("2026-01-30")).tithiClass).toBe("Amavasya");
  });
});

describe("scoreDay", () => {
  it("is deterministic", () => {
    expect(scoreDay(day("2026-10-30"))).toEqual(scoreDay(day("2026-10-30")));
  });

  it("reports the local calendar date", () => {
    expect(scoreDay(new Date(2026, 9, 30, 0, 5)).date).toBe("2026-10-30");
    expect(scoreDay(new Date(2026, 9, 30, 23, 55)).date).toBe("2026-10-30");
  });

  it("clamps every channel to 0–10 across a year", () => {
    for (const d of everyDayOf2026()) {
      for (const score of Object.values(scoreDay(d, "1991-03-14").channels)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });

  it("labels at the 3 and 6 thresholds", () => {
    expect([3, 4, 6, 7].map(labelScore)).toEqual(["avoid", "neutral", "neutral", "favored"]);
  });

  it("adds +1 on a personal affinity day", () => {
    // Born under Mars (Mesha), so Tuesdays match. Personal Year 2026 = 4 + 2 + 1 = 7.
    const birth = "1990-04-20";
    const date = everyDayOf2026().find((d) => {
      const { work } = scoreDay(d).channels;
      return d.getDay() === 2 && work > 0 && work < 10; // clear of the clamp
    })!;
    const base = scoreDay(date);
    const personal = scoreDay(date, birth);
    expect(personal.personal?.affinityDay).toBe(true);
    expect(personal.personal?.stressYear).toBe(false);
    expect(personal.channels.work).toBe(base.channels.work + 1);
    expect(personal.flags.some((f) => f.startsWith("This day is extra you"))).toBe(true);
  });

  it("applies the Personal Year 4 / 8 overlay", () => {
    const date = day("2026-10-28"); // Wednesday, Mercury
    const birth = "1990-01-01"; // PY 1 + 1 + 1 = 3 is not stress; 01-02 gives 4. Sign is Dhanu.
    const stress = scoreDay(date, "1990-01-02");
    const calm = scoreDay(date, birth);
    expect(stress.personal?.personalYear).toBe(4);
    expect(stress.personal?.stressYear).toBe(true);
    expect(calm.personal?.stressYear).toBe(false);
    const base = scoreDay(date);
    expect(stress.channels.rest).toBe(Math.min(10, base.channels.rest + 1));
    expect(stress.channels.work).toBe(Math.max(0, base.channels.work - 1));
    expect(stress.channels.meetings).toBe(base.channels.meetings);
  });
});

describe("domainScoresFromDay", () => {
  const scores = scoreDay(day("2026-10-30"));

  it("covers all 10 domains with preferred first, in the user's order", () => {
    const result = domainScoresFromDay(scores, ["rest", "career"]);
    expect(result.map((d) => d.domain).sort()).toEqual([...ALL_DOMAINS].sort());
    expect(result.slice(0, 2).map((d) => d.domain)).toEqual(["rest", "career"]);
    const others = result.slice(2).map((d) => d.score);
    expect(others).toEqual([...others].sort((a, b) => b - a));
  });

  it("derives money from work and meetings with the weekday adjustment", () => {
    const friday = scoreDay(day("2026-10-30")); // Venus: +1
    const money = domainScoresFromDay(friday, []).find((d) => d.domain === "money");
    const avg = (friday.channels.work + friday.channels.meetings) / 2;
    expect(money?.score).toBe(Math.min(10, avg + 1));
  });

  it("gives preferred domains +0.4", () => {
    const plain = domainScoresFromDay(scores, []).find((d) => d.domain === "rest")!;
    const preferred = domainScoresFromDay(scores, ["rest"]).find((d) => d.domain === "rest")!;
    expect(preferred.score).toBeCloseTo(Math.min(10, plain.score + 0.4), 5);
  });

  it("nudges the Personal Day domains by +0.5", () => {
    // Personal Day 4 on 2026-10-30 → focus.
    const personal = scoreDay(day("2026-10-30"), "1991-03-14");
    expect(personal.personal?.personalDay).toBe(4);
    const withPersonal = domainScoresFromDay(personal, []).find((d) => d.domain === "focus")!;
    const without = domainScoresFromDay(scores, []).find((d) => d.domain === "focus")!;
    expect(withPersonal.score).toBeCloseTo(Math.min(10, without.score + 0.5), 5);
  });
});

describe("buildDayTimeline", () => {
  it.each([[["career"]], [["rest", "money", "family"]], [ALL_DOMAINS]])(
    "holds its invariants for every day of a year with %j",
    (preferred) => {
      for (const d of everyDayOf2026()) {
        const tl = buildDayTimeline(d, preferred);
        expect(tl.chips.length).toBeLessThanOrEqual(12);
        const ids = tl.chips.map((c) => c.keywordId);
        expect(new Set(ids).size).toBe(ids.length);
        expect(tl.domainScores).toHaveLength(10);
        expect(tl.topDomains).toHaveLength(4);
        expect(tl.domainScores.slice(0, preferred.length).map((s) => s.domain)).toEqual(
          preferred.slice(0, 10)
        );
        for (const c of tl.chips) {
          expect(c.startHour).toBeGreaterThanOrEqual(6);
          expect(c.endHour).toBeLessThanOrEqual(24);
          expect(c.endHour).toBeGreaterThan(c.startHour);
        }
        const starts = tl.chips.map((c) => c.startHour);
        expect(starts).toEqual([...starts].sort((a, b) => a - b));
      }
    }
  );

  it("always has a caution chip inside Rahu Kaal, on every weekday", () => {
    for (const d of everyDayOf2026()) {
      const tl = buildDayTimeline(d);
      const inside = tl.chips.filter(
        (c) =>
          c.tone === "caution" &&
          c.startHour >= tl.rahuKaal.startHour &&
          c.endHour <= tl.rahuKaal.endHour
      );
      expect(inside.length, tl.date).toBeGreaterThan(0);
    }
  });

  it("never gives a chip a tone its keyword doesn't have", () => {
    const tones = new Map<string, KeywordTone>();
    for (const d of everyDayOf2026()) {
      for (const c of buildDayTimeline(d).chips) {
        if (tones.has(c.keywordId)) expect(c.tone).toBe(tones.get(c.keywordId));
        tones.set(c.keywordId, c.tone);
      }
    }
  });

  it("exposes numerology and rashi only with a birth date", () => {
    expect(buildDayTimeline(day("2026-10-30")).numerology).toBeUndefined();
    const tl = buildDayTimeline(day("2026-10-30"), ["career"], "1991-03-14");
    expect(tl.numerology).toEqual({ lifePath: 1, personalYear: 9, personalDay: 4 });
    expect(tl.rashi).toEqual({ name: "Meena", lord: "Jupiter", element: "Water" });
    expect(todayCardSummary(day("2026-10-30"), ["career"], "1991-03-14").numerology?.personalDay).toBe(4);
  });
});

describe("tipForEvent", () => {
  const chip = (label: string, domain: string, tone: KeywordTone, startHour: number, endHour: number): TimedChip => ({
    id: label, keywordId: label, label, domain, tone, startHour, endHour, tags: [],
  });
  // Friday: Rahu Kaal 10:30–12:00.
  const timeline = (chips: TimedChip[], label: "avoid" | "neutral" | "favored" = "neutral"): DayTimeline => {
    const base = buildDayTimeline(day("2026-10-30"));
    return {
      ...base,
      chips,
      domainScores: base.domainScores.map((d) => ({ ...d, label })),
    };
  };

  it("leans in for Gym + Body ready", () => {
    const tip = tipForEvent(timeline([chip("Body ready", "health", "energy", 6, 9)]), { startHour: 7, type: "gym" });
    expect(tip).toMatchObject({ leanIn: true, pattern: "lean-in", headline: "Great vibe, go for it" });
    expect(tip.leanInTips).toEqual(["Body ready"]);
  });

  it("keeps in mind for Finance + Hold the pitch / Spend careful", () => {
    const tip = tipForEvent(
      timeline([
        chip("Hold the pitch", "career", "caution", 14, 15),
        chip("Spend careful", "money", "caution", 13, 16),
      ]),
      { startHour: 14, type: "finance" }
    );
    expect(tip).toMatchObject({ pattern: "keep-in-mind", headline: "Give this one extra care" });
    expect(tip.keepInMind).toEqual(["Spend careful"]);
  });

  it("keeps in mind for Doctor + Pace yourself", () => {
    const tip = tipForEvent(timeline([chip("Pace yourself", "health", "caution", 15, 18)]), { startHour: 16, type: "doctor" });
    expect(tip.pattern).toBe("keep-in-mind");
    expect(tip.keepInMind).toContain("Pace yourself");
  });

  it("stays steady for lunch with no strong overlap", () => {
    const tip = tipForEvent(timeline([]), { startHour: 13, type: "other" });
    expect(tip).toMatchObject({ pattern: "neutral", headline: "You're good to go" });
    expect(tip.keepInMind).toEqual(["You're good, keep your rhythm"]);
  });

  it("doesn't list a mood chip as a warning on a steady event", () => {
    const tip = tipForEvent(timeline([chip("Vital up", "health", "mood", 6, 9)]), { startHour: 7, type: "gym" });
    expect(tip.keepInMind).toEqual(["You're good, keep your rhythm"]);
  });

  it("keeps in mind when an event starts in Rahu Kaal, even with good chips", () => {
    const tip = tipForEvent(timeline([chip("Money window", "money", "opportunity", 9, 12)]), { startHour: 11, type: "finance" });
    expect(tip.pattern).toBe("keep-in-mind");
    expect(tip.keepInMind).toEqual(["Keep it short and sweet", "Double-check the details"]);
  });

  it("uses the event's end when finding overlaps", () => {
    const tl = timeline([chip("Spend careful", "money", "caution", 15, 18)]);
    expect(tipForEvent(tl, { startHour: 14, endHour: 14.5, type: "finance" }).pattern).toBe("neutral");
    expect(tipForEvent(tl, { startHour: 14, endHour: 15.5, type: "finance" }).pattern).toBe("keep-in-mind");
  });

  it("leans in when the domain is favored with no caution", () => {
    const tip = tipForEvent(timeline([], "favored"), { startHour: 14, type: "meeting" });
    expect(tip.pattern).toBe("lean-in");
    expect(tip.leanInTips).toEqual(["Speak up", "Make the ask while it feels right"]);
  });
});

describe("inferEventType", () => {
  it.each([
    ["Morning Yoga", "gym"],
    ["Investor update", "finance"],
    ["Dentist", "doctor"],
    ["Lunch with Sam", "other"],
    ["Design review", "meeting"],
  ])("%s → %s", (summary, expected) => {
    expect(inferEventType(summary)).toBe(expected);
  });
});
