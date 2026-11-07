import { loadJson, DailyPlanningRules, PanchangData } from "./data";
import { personalDay, personalYear, lifePathFromBirthDate } from "./numerology";
import { rashiFromBirthDate, type Rashi } from "./zodiac";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type Channel = "work" | "meetings" | "rest" | "socializing";

const CHANNEL_WORDS: Record<Channel, string> = {
  work: "getting things done",
  meetings: "meetings",
  rest: "rest",
  socializing: "seeing friends",
};

export type PersonalDay = {
  lifePath: number;
  personalYear: number;
  personalDay: number;
  rashi: Rashi;
  affinityDay: boolean;
  stressYear: boolean;
};

export type DayScores = {
  date: string;
  weekday: string;
  weekdayLord: string;
  /** Synthetic local panchang stand-ins (no live ephemeris). */
  synthetic: {
    tithiClass: string;
    tithiName: string;
    karana: string;
    yoga: string;
    paksha: "Shukla" | "Krishna";
  };
  channels: Record<Channel, number>;
  labels: Record<Channel, "avoid" | "neutral" | "favored">;
  rahuKaal: { startHour: number; endHour: number; label: string };
  flags: string[];
  bestHourHint: string;
  disclaimer: string;
  personal?: PersonalDay;
};

function clamp(n: number, lo = 0, hi = 10) {
  return Math.max(lo, Math.min(hi, n));
}

export function labelScore(score: number): "avoid" | "neutral" | "favored" {
  if (score <= 3) return "avoid";
  if (score <= 6) return "neutral";
  return "favored";
}

/**
 * Deterministic synthetic tithi/karana/yoga from calendar date
 * so the MVP works without an ephemeris. Not astronomical.
 */
export function syntheticPanchang(date: Date) {
  const dayOfYear =
    Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 0)) /
        86400000
    );
  const tithiNum = ((dayOfYear - 1) % 30) + 1; // 1–30
  const paksha: "Shukla" | "Krishna" = tithiNum <= 15 ? "Shukla" : "Krishna";
  const lunarDay = ((tithiNum - 1) % 15) + 1;
  const panchang = loadJson<PanchangData>("panchang.json");
  const tithiMeta =
    panchang.tithis.names_shukla_or_krishna.find((t) => t.num === lunarDay) ||
    panchang.tithis.names_shukla_or_krishna[0];

  let tithiClass = tithiMeta.class;
  if (tithiNum === 30) tithiClass = "Amavasya";
  else if (tithiNum === 15) tithiClass = "Purnima";
  else if (tithiClass.includes("/")) tithiClass = paksha === "Shukla" ? "Purna" : "Amavasya";

  const karanas = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"];
  const karana = karanas[dayOfYear % 7];

  const yogas = [
    "Siddhi",
    "Shiva",
    "Siddha",
    "Sadhya",
    "Shubha",
    "Brahma",
    "Indra",
    "Saubhagya",
    "Ayushman",
    "Atiganda",
    "Shula",
    "Ganda",
    "Vyaghata",
    "Vyatipata",
    "Parigha",
    "Vaidhriti",
    "Priti",
    "Harshana",
  ];
  const yoga = yogas[dayOfYear % yogas.length];

  return {
    tithiClass,
    tithiName: tithiMeta.name,
    karana,
    yoga,
    paksha,
    lunarDay,
    tithiNum,
  };
}

/** Rahu Kaal as eighth of a fixed 6:00–18:00 daylight for MVP. */
export function rahuKaalWindow(weekday: string) {
  const panchang = loadJson<PanchangData>("panchang.json");
  const part = panchang.rahu_kaal.weekday_part[weekday] || 8;
  const sunrise = 6;
  const sunset = 18;
  const eighth = (sunset - sunrise) / 8;
  const startHour = sunrise + (part - 1) * eighth;
  const endHour = startHour + eighth;
  return {
    startHour,
    endHour,
    label: `Breather time ~${fmtHour(startHour)}–${fmtHour(endHour)} (approx.)`,
  };
}

function fmtHour(h: number) {
  const hr = Math.floor(h);
  const min = Math.round((h - hr) * 60);
  const ampm = hr >= 12 ? "PM" : "AM";
  const h12 = ((hr + 11) % 12) + 1;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

/** YYYY-MM-DD of the local calendar day. toISOString would give the UTC day. */
function localIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function personalOverlay(date: Date, weekdayLord: string, birthDate: string): PersonalDay {
  const year = date.getFullYear();
  const py = personalYear(birthDate, year);
  const rashi = rashiFromBirthDate(birthDate);
  return {
    lifePath: lifePathFromBirthDate(birthDate),
    personalYear: py,
    personalDay: personalDay(birthDate, year, date.getMonth() + 1, date.getDate()),
    rashi,
    affinityDay: rashi.lord === weekdayLord,
    stressYear: py === 4 || py === 8,
  };
}

export function scoreDay(date = new Date(), birthDate = ""): DayScores {
  const rules = loadJson<DailyPlanningRules>("daily-planning-rules.json");
  const panchang = loadJson<PanchangData>("panchang.json");
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const weekdayLord =
    panchang.vara.days.find((d) => d.weekday === weekday)?.lord || "Sun";
  const synth = syntheticPanchang(date);
  const channels: Channel[] = ["work", "meetings", "rest", "socializing"];
  const scores = {} as Record<Channel, number>;
  const personal = birthDate ? personalOverlay(date, weekdayLord, birthDate) : undefined;

  for (const ch of channels) {
    let s = 5;
    s += rules.base_scores.weekday_affinity[ch]?.[weekdayLord] ?? 0;
    s += rules.base_scores.tithi_modifier[synth.tithiClass]?.[ch] ?? 0;

    if (synth.karana === "Vishti") {
      s += rules.base_scores.karana_modifier.Vishti?.[ch] ?? 0;
    } else if (synth.karana === "Vanija") {
      s += rules.base_scores.karana_modifier.Vanija?.[ch] ?? 0;
    }

    const ym = rules.base_scores.yoga_modifier;
    if (ym.inauspicious_list.includes(synth.yoga)) {
      s += ym.inauspicious_penalty[ch] ?? 0;
    } else if (ym.highly_auspicious.includes(synth.yoga)) {
      s += ym.auspicious_bonus[ch] ?? 0;
    }

    if (synth.paksha === "Shukla" && (ch === "work" || ch === "meetings")) s += 1;
    if (synth.paksha === "Krishna" && ch === "rest") s += 1;

    if (personal?.affinityDay) s += 1;
    if (personal?.stressYear) {
      if (ch === "work" || ch === "socializing") s -= 1;
      if (ch === "rest") s += 1;
    }

    scores[ch] = clamp(s);
  }

  const rk = rahuKaalWindow(weekday);
  const flags: string[] = [];
  if (synth.tithiClass === "Rikta" || synth.tithiClass === "Amavasya") {
    flags.push("A tidy-up kind of day: great for admin and rest. Big launches can wait.");
  }
  if (synth.karana === "Vishti") {
    flags.push("Great day to finish things. Save brand-new starts for later.");
  }
  if (rules.base_scores.yoga_modifier.inauspicious_list.includes(synth.yoga)) {
    flags.push("Keep plans short and simple today.");
  }
  flags.push(rk.label);
  if (personal?.affinityDay) {
    flags.push("This day is extra you. Your sign and today's planet line up.");
  }
  if (personal?.stressYear) {
    flags.push("You're in a slower-paced year. Rest counts as progress.");
  }

  const bestChannel = channels.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
  // Suggest mid-morning outside Rahu Kaal
  let bestHour = 10;
  if (bestHour >= rk.startHour && bestHour < rk.endHour) bestHour = Math.ceil(rk.endHour);

  return {
    date: localIsoDate(date),
    weekday,
    weekdayLord,
    synthetic: {
      tithiClass: synth.tithiClass,
      tithiName: synth.tithiName,
      karana: synth.karana,
      yoga: synth.yoga,
      paksha: synth.paksha,
    },
    channels: scores,
    labels: {
      work: labelScore(scores.work),
      meetings: labelScore(scores.meetings),
      rest: labelScore(scores.rest),
      socializing: labelScore(scores.socializing),
    },
    rahuKaal: rk,
    flags,
    bestHourHint: `Best time today: around ${fmtHour(bestHour)} for ${CHANNEL_WORDS[bestChannel]}.`,
    disclaimer:
      "Traditional/symbolic guidance for fun and reflection, not predictive certainty. Approximate timing.",
    ...(personal ? { personal } : {}),
  };
}

export function isInRahuKaal(date: Date, hour: number): boolean {
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const rk = rahuKaalWindow(weekday);
  return hour >= rk.startHour && hour < rk.endHour;
}
