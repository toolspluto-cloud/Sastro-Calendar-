import { loadJson } from "./data";
import { scoreDay } from "./scoring";
import { answerMoment, matchMoment } from "./moments";
import { readAdjustments, readProfile } from "./store";
import { todayCardSummary } from "./timeline";
import { EXPLAINERS, VIBE_WORDS, type VibeLabel } from "./vibes";

type JsonRecord = Record<string, unknown>;

function flattenText(value: unknown, out: string[] = [], prefix = ""): string[] {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push(`${prefix}${String(value)}`);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => flattenText(v, out, `${prefix}[${i}] `));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as JsonRecord)) {
      flattenText(v, out, `${prefix}${k}: `);
    }
  }
  return out;
}

const CORPUS_FILES = [
  "nakshatras.json",
  "rashis.json",
  "grahas.json",
  "bhavas.json",
  "panchang.json",
  "numerology.json",
  "palmistry.json",
  "meeting-prep-rules.json",
  "photo-handling-rules.json",
  "daily-planning-rules.json",
] as const;

type Chunk = { source: string; text: string };

let cachedChunks: Chunk[] | null = null;

function getChunks(): Chunk[] {
  if (cachedChunks) return cachedChunks;
  const chunks: Chunk[] = [];
  for (const file of CORPUS_FILES) {
    try {
      const data = loadJson(file);
      const lines = flattenText(data).filter((l) => l.length > 20 && l.length < 500);
      for (const text of lines.slice(0, 200)) {
        chunks.push({ source: file, text });
      }
    } catch {
      /* skip missing */
    }
  }
  cachedChunks = chunks;
  return chunks;
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreChunk(tokens: string[], text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (lower.includes(t)) s += 1;
  }
  return s;
}

const VIBE_NUDGE: Record<VibeLabel, string> = {
  favored: "Text that friend you've been meaning to see.",
  neutral: "Pick one small thing that makes you smile.",
  avoid: "A cosy night in sounds just right.",
};

export const FRIENDLY_DISCLAIMER = "Traditional/symbolic guidance for fun and reflection. You make the call.";

const SUPPORT_REPLY =
  "I'm really glad you told me, and I'm so sorry you're going through this. This is bigger than a calendar app, and you deserve real support. Please reach out to someone you trust or your local emergency or crisis helpline right now. You don't have to carry this alone.";

export type ChatAnswer = {
  answer: string;
  sources: string[];
  matches: Array<{ source: string; excerpt: string }>;
  disclaimer: string;
};

export function isCrisisMessage(text: string) {
  return /\b(kill myself|suicid\w*|hurt myself|self.?harm|end my life|want to die|hits? me|abus\w*)\b/i.test(text);
}

/** Top training-data chunks for a question, for rule replies and AI context. */
export function retrieveChunks(question: string) {
  const tokens = tokenize(question);
  return getChunks()
    .map((c) => ({ ...c, score: scoreChunk(tokens, c.text) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function dailyTip(): { tip: string; source: string } {
  const day = scoreDay(new Date(), readProfile().birthDate);
  const tips = [
    day.bestHourHint,
    `${day.weekday}s are for you. ${VIBE_NUDGE[day.labels.socializing]}`,
    day.flags[0] || day.bestHourHint,
    `Meetings today: ${VIBE_WORDS[day.labels.meetings]}.`,
  ];
  const idx = new Date().getDate() % tips.length;
  return {
    tip: tips[idx],
    source: "Satro",
  };
}


export function howTodayLooks(date = new Date()) {
  const profile = readProfile();
  return todayCardSummary(date, profile.preferredDomains, profile.birthDate, readAdjustments());
}

export function answerFromCorpus(question: string): ChatAnswer {
  const q = question.trim();
  if (!q) {
    return {
      answer: "Ask me anything! Dates, exams, interviews, nights out: I'll find your best time.",
      sources: [],
      matches: [],
      disclaimer: FRIENDLY_DISCLAIMER,
    };
  }

  const lower = q.toLowerCase();
  if (isCrisisMessage(q)) {
    return { answer: SUPPORT_REPLY, sources: [], matches: [], disclaimer: "" };
  }
  const explainer = EXPLAINERS.find((e) => e.match.test(q));
  if (explainer) {
    return { answer: explainer.body, sources: [], matches: [], disclaimer: FRIENDLY_DISCLAIMER };
  }
  const moment = matchMoment(q);
  if (moment) {
    const profile = readProfile();
    return {
      answer: answerMoment(moment, new Date(), profile.preferredDomains, profile.birthDate),
      sources: [],
      matches: [],
      disclaimer: FRIENDLY_DISCLAIMER,
    };
  }
  // Scripted shortcuts
  if (/(tip|today|best hour|rahu)/.test(lower)) {
    const tip = dailyTip();
    return {
      answer: tip.tip,
      sources: [tip.source],
      matches: [],
      disclaimer: FRIENDLY_DISCLAIMER,
    };
  }
  if (/life path|numerology|pythagorean|chaldean/.test(lower)) {
    const data = loadJson<JsonRecord>("numerology.json");
    return {
      answer:
        "Life Path: reduce birth month, day, and year (keep masters 11/22/33), then sum and reduce. Pythagorean maps A=1…I=9 repeating; Chaldean uses a different letter chart (no letter = 9). Use Prep to compute two Life Paths.",
      sources: ["numerology.json"],
      matches: [{ source: "numerology.json", excerpt: String(data.description || "") }],
      disclaimer: "Traditional/symbolic entertainment guidance.",
    };
  }
  if (/palm|heart line|head line|life line|fate line|mount/.test(lower)) {
    return {
      answer:
        "Major lines: Heart (emotions), Head (thinking), Life (vitality/path themes), Fate (career direction when present). Hand shapes Earth/Air/Fire/Water color the reading. For photos: spread fingers, flat surface, even light — see photo-handling rules.",
      sources: ["palmistry.json", "photo-handling-rules.json"],
      matches: [],
      disclaimer: "Traditional/symbolic — not medical advice.",
    };
  }
  if (/photo|blur|retake|face|handwriting/.test(lower)) {
    return {
      answer:
        "Ask for a retake when blur, partial palm/face, wrong angle, or covered lines block a reading. Warm phrasing: “Could you try again with fingers spread on a flat surface and even light?” Delete images after analysis. Face/handwriting ML is out of MVP scope.",
      sources: ["photo-handling-rules.json"],
      matches: [],
      disclaimer: "Privacy: do not retain biometric images after analysis.",
    };
  }
  if (/prep|meeting|pitch|talk/.test(lower)) {
    return {
      answer:
        "Got someone to prepare for? Open Prep, tell me who you're meeting, and I'll give you the best way to connect with them.",
      sources: ["meeting-prep-rules.json"],
      matches: [],
      disclaimer: "Not predictive certainty — symbolic guidance only.",
    };
  }

  const ranked = retrieveChunks(q);

  if (ranked.length === 0) {
    return {
      answer:
        "Hmm, I'm not sure about that one yet! Try me on dates, crushes, exams, interviews, meetings or nights out, and I'll find your best time.",
      sources: [],
      matches: [],
      disclaimer: FRIENDLY_DISCLAIMER,
    };
  }

  const answer = ranked.map((r) => `• ${r.text.slice(0, 220)}`).join("\n");
  return {
    answer,
    sources: Array.from(new Set(ranked.map((r) => r.source))),
    matches: ranked.map((r) => ({ source: r.source, excerpt: r.text.slice(0, 160) })),
    disclaimer: "Matched from local training JSON — traditional/symbolic, not predictive certainty.",
  };
}
