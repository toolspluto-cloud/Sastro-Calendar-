/**
 * Satro's voice. Screens say these friendly words; engine terms such as
 * Rahu Kaal stay in code and appear only inside the explainers below.
 * Safe to import on the client.
 */

export type VibeLabel = "avoid" | "neutral" | "favored";

export const VIBE_WORDS: Record<VibeLabel, string> = {
  favored: "Great vibe",
  neutral: "Good to go",
  avoid: "Take it easy",
};

export const BREATHER = "Breather time";

export type Explainer = { id: string; title: string; body: string; match: RegExp };

export const EXPLAINERS: Explainer[] = [
  {
    id: "breather",
    title: "What's Breather time?",
    body: "Breather time is a short window each day that's better for finishing things than starting them. In Vedic tradition it's called Rahu Kaal: one of 8 equal parts of the daylight, chosen by the weekday. Anything you've already started can carry on.",
    match: /\b(rahu|ketu|rahu ?kaal|breather|yamaganda|gulika)\b/i,
  },
  {
    id: "scores",
    title: "How do you pick my vibes?",
    body: "Satro blends the weekday's planet, a simple moon-cycle estimate and your birth date into a daily score for each part of life. It's traditional and symbolic, so treat it as a friendly nudge, not a forecast.",
    match: /\b(how do you (work|know|pick)|vibe score|panchang|tithi|karana|nakshatra|muhurat|graha)\b/i,
  },
  {
    id: "numbers",
    title: "What's my Life Path?",
    body: "It's a number from your birth date that sums up your natural style, like leadership or creativity. Your daily number shifts each day and nudges what gets a little extra glow.",
    match: /\b(life path|numerology|personal day|personal year|lucky number)\b/i,
  },
  {
    id: "sign",
    title: "What's my Sun sign here?",
    body: "Satro uses the Vedic (sidereal) calendar, so your sign may differ from the one in magazines. It's an estimate from your birth date alone.",
    match: /\b(rashi|sun sign|zodiac|sidereal|my sign)\b/i,
  },
];

export function explainerById(id: string) {
  return EXPLAINERS.find((e) => e.id === id);
}

export function formatHour(hour: number) {
  const whole = Math.floor(hour) % 24;
  const minutes = Math.round((hour - Math.floor(hour)) * 60);
  const h12 = ((whole + 11) % 12) + 1;
  return `${h12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""} ${whole >= 12 ? "PM" : "AM"}`;
}

type RailChip = { label: string; tone: string; startHour: number; endHour: number };
type Rail = { chips: RailChip[]; rahuKaal: { startHour: number; endHour: number } };

const POSITIVE_TONES = ["opportunity", "energy"];

/** Plain-language read of one moment in the day. */
export function vibeAt(rail: Rail, hour: number): { word: string; line: string } {
  if (hour < 6) return { word: "Rest up", line: "Sleep now. Tomorrow's vibes are loading." };
  if (hour >= rail.rahuKaal.startHour && hour < rail.rahuKaal.endHour) {
    return { word: BREATHER, line: "Wrap up what's open. Big new starts can wait a bit." };
  }
  const now = rail.chips.filter((c) => c.startHour <= hour && c.endHour > hour);
  const easy = now.find((c) => c.tone === "caution");
  if (easy) return { word: "Take it easy", line: `${easy.label} is your move right now.` };
  const good = now.find((c) => POSITIVE_TONES.includes(c.tone));
  if (good) return { word: "Great vibe", line: `${good.label}. Make the most of it!` };
  return { word: "Good to go", line: "Nice and easy right now. Go do your thing." };
}

/** The next upcoming window with a positive chip today, if any. */
export function nextBestTime(rail: Rail, hour: number) {
  const next = rail.chips
    .filter((c) => POSITIVE_TONES.includes(c.tone) && c.startHour > hour)
    .sort((a, b) => a.startHour - b.startHour)[0];
  return next ? { time: formatHour(next.startHour), label: next.label } : null;
}
