import { format } from "date-fns";
import { loadJson } from "./data";
import { buildDayTimeline, type DayTimeline } from "./timeline";
import { formatHour } from "./vibes";

export type Moment = {
  id: string;
  group: string;
  emoji: string;
  label: string;
  question: string;
  match: string;
  domain: string;
  hours: [number, number];
  fixed?: boolean; // the date isn't yours to pick, so advise on prep time
  soon?: boolean; // shouldn't wait for days, so only look at today and tomorrow
  lead?: string;
  tips: string[];
  note?: string;
};

export type MomentChip = Pick<Moment, "id" | "group" | "emoji" | "label" | "question">;

export type BestSlot = { date: Date; hour: number; score: number };

const SEARCH_DAYS = 7;
const SOON_DAYS = 2;

export function loadMoments(): Moment[] {
  return loadJson<{ moments: Moment[] }>("moments.json").moments;
}

export function momentChips(): MomentChip[] {
  return loadMoments().map(({ id, group, emoji, label, question }) => ({
    id,
    group,
    emoji,
    label,
    question,
  }));
}

export function matchMoment(question: string): Moment | null {
  return loadMoments().find((m) => new RegExp(m.match, "i").test(question)) ?? null;
}

function bestSlotInDay(moment: Moment, tl: DayTimeline, date: Date, fromHour: number): BestSlot | null {
  const domainScore = tl.domainScores.find((d) => d.domain === moment.domain)?.score ?? 5;
  let best: BestSlot | null = null;
  for (let hour = Math.max(moment.hours[0], fromHour); hour < moment.hours[1]; hour++) {
    const inBreather = hour < tl.rahuKaal.endHour && hour + 1 > tl.rahuKaal.startHour;
    if (inBreather) continue;
    const chips = tl.chips.filter((c) => c.startHour < hour + 1 && c.endHour > hour);
    const lift = chips.filter((c) => c.tone === "opportunity" || c.tone === "energy").length * 0.5;
    const drag = chips.filter((c) => c.tone === "caution").length;
    const score = domainScore + lift - drag;
    if (!best || score > best.score) best = { date, hour, score };
  }
  return best;
}

/** Best slot left today, and the best slot across the coming week. */
export function findBestTimes(
  moment: Moment,
  now: Date,
  preferredDomains: string[],
  birthDate: string
) {
  let today: BestSlot | null = null;
  let week: BestSlot | null = null;
  for (let i = 0; i < (moment.soon ? SOON_DAYS : SEARCH_DAYS); i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const tl = buildDayTimeline(date, preferredDomains, birthDate);
    const slot = bestSlotInDay(moment, tl, date, i === 0 ? now.getHours() + 1 : 0);
    if (i === 0) today = slot;
    if (slot && (!week || slot.score > week.score)) week = slot;
  }
  return { today, week };
}

const GREAT_SCORE = 7;
const OKAY_SCORE = 5;

function when(slot: BestSlot, now: Date) {
  const sameDay = format(slot.date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
  return `${sameDay ? "today" : format(slot.date, "EEEE")} around ${formatHour(slot.hour)}`;
}

/** The computed facts behind an answer, for the AI to phrase but not change. */
export function momentFacts(
  moment: Moment,
  now: Date,
  preferredDomains: string[],
  birthDate: string
) {
  const { today, week } = findBestTimes(moment, now, preferredDomains, birthDate);
  const slot = today && today.score >= OKAY_SCORE ? today : week ?? today;
  return {
    topic: moment.label,
    bestTime: slot ? when(slot, now) : undefined,
    vibe: slot && slot.score >= GREAT_SCORE ? "great vibe" : "good to go",
    prepOnly: moment.fixed ? "The date is fixed, so this is the best time to get ready." : undefined,
    opening: moment.lead,
    tips: moment.tips,
    note: moment.note,
  };
}

/** A warm, plain answer. Never predicts an outcome. */
export function answerMoment(
  moment: Moment,
  now: Date,
  preferredDomains: string[],
  birthDate: string
): string {
  const { today, week } = findBestTimes(moment, now, preferredDomains, birthDate);
  const lines: string[] = [];
  if (moment.lead) lines.push(moment.lead);

  const best = moment.fixed ? "Your best time to get ready" : "Your best time";
  if (!today && week) {
    lines.push(`Let's plan ahead. ${best} is ${when(week, now)}.`);
  } else if (today && today.score >= GREAT_SCORE) {
    lines.push(`Love this for you! ${best} is ${when(today, now)}. Great vibe.`);
  } else if (today && today.score >= OKAY_SCORE) {
    lines.push(`You're good to go. ${best} is ${when(today, now)}.`);
  } else if (week && week !== today) {
    lines.push(`Today's more of a chill day for this. ${best} is ${when(week, now)}.`);
  } else if (today) {
    lines.push(`Go easy on yourself today. ${best} is ${when(today, now)}.`);
  }
  if (today && week && today !== week && week.score > today.score && today.score >= OKAY_SCORE) {
    lines.push(`Want an even better one? Try ${when(week, now)}.`);
  }

  const tip = moment.tips[now.getDate() % moment.tips.length];
  lines.push(`Try this: ${tip}`);
  if (moment.note) lines.push(moment.note);
  lines.push("You've got this.");
  return lines.join("\n\n");
}
