import { loadJson } from "./data";
import { scoreDay, isInRahuKaal, labelScore, type DayScores } from "./scoring";
import type { EventType } from "./eventType";
import type { Domain } from "./profile";

export type { EventType };

export type KeywordTone = "mood" | "energy" | "opportunity" | "caution";

export type TimelineKeyword = {
  id: string;
  label: string;
  domain: Domain | string;
  tone: KeywordTone;
  tags: string[];
};

export type KeywordLibrary = {
  domains: string[];
  tones: string[];
  keywords: TimelineKeyword[];
  disclaimer: string;
};

export type TimedChip = {
  id: string;
  keywordId: string;
  label: string;
  domain: string;
  tone: KeywordTone;
  startHour: number;
  endHour: number;
  tags: string[];
};

export type DomainScore = {
  domain: string;
  score: number;
  label: "avoid" | "neutral" | "favored";
};

export type DayTimeline = {
  date: string;
  weekday: string;
  weekdayLord: string;
  window: { startHour: number; endHour: number };
  chips: TimedChip[];
  domainScores: DomainScore[];
  topDomains: DomainScore[];
  rahuKaal: DayScores["rahuKaal"];
  flags: string[];
  numerology?: { lifePath: number; personalYear: number; personalDay: number };
  rashi?: { name: string; lord: string; element: string };
  disclaimer: string;
};

export type TipPattern = "lean-in" | "keep-in-mind" | "neutral";

export type EventTip = {
  leanIn: boolean;
  pattern: TipPattern;
  headline: string;
  keepInMind: string[];
  leanInTips: string[];
  overlappingChips: TimedChip[];
  domain: string;
};

const EVENT_DOMAIN: Record<EventType, string> = {
  gym: "health",
  meeting: "career",
  finance: "money",
  doctor: "health",
  other: "focus",
};

/** Map MVP channels → V2 life domains. */
const CHANNEL_TO_DOMAINS: Record<string, string[]> = {
  work: ["career", "focus", "creativity"],
  meetings: ["career", "social", "romance"],
  rest: ["rest", "health", "family"],
  socializing: ["social", "romance", "family", "travel"],
};

/** Satro house rule: the Personal Day leans toward these domains. */
const PERSONAL_DAY_DOMAINS: Record<number, string[]> = {
  1: ["career"],
  2: ["social", "romance"],
  3: ["creativity"],
  4: ["focus"],
  5: ["travel"],
  6: ["family"],
  7: ["rest", "focus"],
  8: ["money", "career"],
  9: ["social", "family"],
};
const PERSONAL_DAY_NUDGE = 0.5;

const MONEY_WEEKDAY_ADJUST: Record<string, number> = {
  Jupiter: 1,
  Mercury: 1,
  Venus: 1,
  Saturn: -1,
};

/** Soft hour bands for placing chips (6 → 24). */
const BANDS: Array<{ start: number; end: number; bias: string[] }> = [
  { start: 6, end: 9, bias: ["health", "rest", "focus"] },
  { start: 9, end: 12, bias: ["career", "focus", "money"] },
  { start: 12, end: 15, bias: ["social", "money", "career"] },
  { start: 15, end: 18, bias: ["creativity", "career", "travel"] },
  { start: 18, end: 21, bias: ["social", "romance", "family"] },
  { start: 21, end: 24, bias: ["rest", "family", "health"] },
];

function clampScore(n: number) {
  return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
}

export function loadKeywordLibrary(): KeywordLibrary {
  return loadJson<KeywordLibrary>("timeline-keywords.json");
}

export function domainScoresFromDay(
  day: DayScores,
  preferred: string[] = ["career"],
  adjustments: Record<string, number> = {}
): DomainScore[] {
  const raw: Record<string, number[]> = {};
  for (const [ch, score] of Object.entries(day.channels)) {
    for (const d of CHANNEL_TO_DOMAINS[ch] || []) {
      if (!raw[d]) raw[d] = [];
      raw[d].push(score);
    }
  }
  raw.money = [
    (day.channels.work + day.channels.meetings) / 2 +
      (MONEY_WEEKDAY_ADJUST[day.weekdayLord] ?? 0),
  ];
  // Ensure all 10 domains appear
  const lib = loadKeywordLibrary();
  for (const d of lib.domains) {
    if (!raw[d]) raw[d] = [5];
  }
  const nudged = day.personal ? PERSONAL_DAY_DOMAINS[day.personal.personalDay] ?? [] : [];
  const scores: DomainScore[] = Object.entries(raw).map(([domain, arr]) => {
    let avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    // Slight boost for preferred domains so career stays first-class
    if (preferred.includes(domain)) avg = Math.min(10, avg + 0.4);
    if (nudged.includes(domain)) avg += PERSONAL_DAY_NUDGE;
    avg += adjustments[domain] ?? 0; // learned from "How did it go?"
    const score = clampScore(avg);
    return { domain, score, label: labelScore(score) };
  });
  scores.sort((a, b) => {
    const prefA = preferred.indexOf(a.domain);
    const prefB = preferred.indexOf(b.domain);
    if (prefA !== -1 || prefB !== -1) {
      if (prefA === -1) return 1;
      if (prefB === -1) return -1;
      if (prefA !== prefB) return prefA - prefB;
    }
    return b.score - a.score;
  });
  return scores;
}

function pickKeyword(
  pool: TimelineKeyword[],
  domain: string,
  preferTone: KeywordTone | null,
  used: Set<string>
): TimelineKeyword | null {
  const free = pool.filter((k) => k.domain === domain && !used.has(k.id));
  return free.find((k) => !preferTone || k.tone === preferTone) || free[0] || null;
}

/**
 * Build timed keyword chips for a calendar day (6:00–24:00).
 * Heuristic: weekday scores + Rahu Kaal caution + preferred domains.
 */
export function buildDayTimeline(
  date = new Date(),
  preferredDomains: string[] = ["career"],
  birthDate = "",
  adjustments: Record<string, number> = {}
): DayTimeline {
  const day = scoreDay(date, birthDate);
  const lib = loadKeywordLibrary();
  const domainScores = domainScoresFromDay(day, preferredDomains, adjustments);
  const scoreByDomain = Object.fromEntries(domainScores.map((d) => [d.domain, d]));
  const used = new Set<string>();
  const chips: TimedChip[] = [];

  for (const band of BANDS) {
    const mid = (band.start + band.end) / 2;
    const inRahu = isInRahuKaal(date, mid);
    const rahuStart = Math.max(band.start, day.rahuKaal.startHour);
    const rahuEnd = Math.min(band.end, day.rahuKaal.endHour);
    const overlapsRahu = rahuStart < rahuEnd;

    // Order domains: preferred first, then band bias, then by score
    const ordered = [
      ...preferredDomains,
      ...band.bias,
      ...domainScores.map((d) => d.domain),
    ].filter((d, i, arr) => arr.indexOf(d) === i);

    let placed = 0;
    for (const domain of ordered) {
      if (placed >= 2) break;
      const ds = scoreByDomain[domain];
      let tone: KeywordTone | null = null;
      if (inRahu) tone = "caution";
      else if (ds?.label === "favored") tone = "opportunity";
      else if (ds?.label === "avoid") tone = "caution";
      else if (band.start >= 21) tone = "energy";
      else if (band.start < 9) tone = "mood";

      const kw = pickKeyword(lib.keywords, domain, tone, used);
      if (!kw) continue;
      used.add(kw.id);

      // A chip spans its band; caution chips in Rahu Kaal clamp to the Rahu window
      const clampToRahu = inRahu && kw.tone === "caution";
      const startHour = clampToRahu ? rahuStart : band.start;
      const endHour = clampToRahu ? rahuEnd : band.end;

      chips.push({
        id: `${kw.id}-${band.start}`,
        keywordId: kw.id,
        label: kw.label,
        domain: kw.domain,
        tone: kw.tone,
        startHour,
        endHour,
        tags: kw.tags || [],
      });
      placed += 1;
    }

    // Always add a Rahu caution chip when the band overlaps Rahu Kaal
    if (overlapsRahu) {
      const cautions = lib.keywords.filter((k) => k.tone === "caution" && !used.has(k.id));
      const caution =
        cautions.find((k) => k.domain === preferredDomains[0]) || cautions[0];
      if (caution) {
        used.add(caution.id);
        chips.push({
          id: `${caution.id}-rahu-${band.start}`,
          keywordId: caution.id,
          label: caution.label,
          domain: caution.domain,
          tone: "caution",
          startHour: rahuStart,
          endHour: rahuEnd,
          tags: [...(caution.tags || []), "rahu-kaal"],
        });
      }
    }
  }

  // Cap at 12 chips for a clean rail
  chips.sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
  const capped = chips.slice(0, 12);

  return {
    date: day.date,
    weekday: day.weekday,
    weekdayLord: day.weekdayLord,
    window: { startHour: 6, endHour: 24 },
    chips: capped,
    domainScores,
    topDomains: domainScores.slice(0, 4),
    rahuKaal: day.rahuKaal,
    flags: day.flags,
    ...(day.personal
      ? {
          numerology: {
            lifePath: day.personal.lifePath,
            personalYear: day.personal.personalYear,
            personalDay: day.personal.personalDay,
          },
          rashi: {
            name: day.personal.rashi.sanskrit,
            lord: day.personal.rashi.lord,
            element: day.personal.rashi.element,
          },
        }
      : {}),
    disclaimer: lib.disclaimer || day.disclaimer,
  };
}

export function chipsOverlappingHour(chips: TimedChip[], hour: number): TimedChip[] {
  return chips.filter((c) => hour >= c.startHour && hour < c.endHour);
}

export function tipForEvent(
  timeline: DayTimeline,
  opts: { startHour: number; endHour?: number; type?: EventType | string }
): EventTip {
  const type = (opts.type || "other") as EventType;
  const domain = EVENT_DOMAIN[type] || EVENT_DOMAIN.other;
  const start = opts.startHour;
  const end = opts.endHour ?? start + 1;
  const overlapping = timeline.chips.filter(
    (c) => c.startHour < end && c.endHour > start
  );
  const domainRelevant = overlapping.filter((c) => c.domain === domain);
  const pool = domainRelevant.length > 0 ? domainRelevant : overlapping;
  const caution = pool.filter((c) => c.tone === "caution");
  const opportunity = pool.filter((c) => c.tone === "opportunity" || c.tone === "energy");
  const ds = timeline.domainScores.find((d) => d.domain === domain);
  const inRahu = isInRahuKaal(new Date(timeline.date + "T12:00:00"), start);
  const leanIn =
    caution.length === 0 &&
    (opportunity.length > 0 || ds?.label === "favored") &&
    !inRahu;

  const leanInTips = opportunity.slice(0, 3).map((c) => c.label);
  const keepInMind = [
    ...caution.map((c) => c.label),
    ...pool.filter((c) => c.tone === "mood").slice(0, 2).map((c) => c.label),
  ].slice(0, 4);

  let pattern: TipPattern;
  if (leanIn) pattern = "lean-in";
  else if (caution.length > 0 || inRahu) pattern = "keep-in-mind";
  else pattern = "neutral";

  if (leanInTips.length === 0 && pattern === "lean-in") {
    leanInTips.push("Speak up", "Make the ask while it feels right");
  }
  if (keepInMind.length === 0 && pattern === "keep-in-mind") {
    keepInMind.push("Keep it short and sweet", "Double-check the details");
  }
  const steadyTips = pattern === "neutral" ? ["You're good, keep your rhythm"] : keepInMind;

  const headline =
    pattern === "lean-in"
      ? "Great vibe, go for it"
      : pattern === "keep-in-mind"
        ? "Give this one extra care"
        : "You're good to go";

  return {
    leanIn,
    pattern,
    headline,
    keepInMind: steadyTips,
    leanInTips,
    overlappingChips: pool.slice(0, 5),
    domain,
  };
}

export function todayCardSummary(
  date = new Date(),
  preferredDomains: string[] = ["career"],
  birthDate = "",
  adjustments: Record<string, number> = {}
) {
  const tl = buildDayTimeline(date, preferredDomains, birthDate, adjustments);
  const highlightChips = [
    ...tl.chips.filter((c) => c.tone === "opportunity").slice(0, 2),
    ...tl.chips.filter((c) => c.tone === "mood").slice(0, 1),
    ...tl.chips.filter((c) => c.tone === "caution").slice(0, 1),
    ...tl.chips.filter((c) => c.tone === "energy").slice(0, 1),
  ]
    .filter((c, i, arr) => arr.findIndex((x) => x.keywordId === c.keywordId) === i)
    .slice(0, 5);

  return {
    date: tl.date,
    weekday: tl.weekday,
    weekdayLord: tl.weekdayLord,
    topDomains: tl.topDomains,
    chips: highlightChips,
    rahuKaal: tl.rahuKaal,
    numerology: tl.numerology,
    rashi: tl.rashi,
    disclaimer: tl.disclaimer,
  };
}
