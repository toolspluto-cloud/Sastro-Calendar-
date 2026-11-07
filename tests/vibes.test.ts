import fs from "fs";
import { describe, expect, it } from "vitest";
import { answerFromCorpus, dailyTip, howTodayLooks } from "../src/lib/chat";
import { answerMoment, findBestTimes, loadMoments, matchMoment } from "../src/lib/moments";
import { buildDayTimeline, tipForEvent } from "../src/lib/timeline";
import { formatHour, nextBestTime, vibeAt } from "../src/lib/vibes";

const JARGON = /rahu|ketu|panchang|tithi|karana|yoga\b|nakshatra|muhurat|inauspicious|synthetic|lord\b/i;
const FRIDAY = new Date(2026, 9, 30, 9, 0);

describe("friendly language", () => {
  it("keeps jargon out of everything the day timeline shows", () => {
    for (let i = 0; i < 60; i++) {
      const tl = buildDayTimeline(new Date(2026, 0, 1 + i, 12), ["career"], "1991-03-14");
      const shown = [tl.rahuKaal.label, ...tl.flags, ...tl.chips.map((c) => c.label)];
      expect(shown.filter((s) => JARGON.test(s))).toEqual([]);
      const tip = tipForEvent(tl, { startHour: 11, type: "finance" });
      expect(JSON.stringify([tip.headline, tip.keepInMind, tip.leanInTips])).not.toMatch(JARGON);
    }
  });

  it("keeps jargon out of daily tips and today's summary labels", () => {
    expect(dailyTip().tip).not.toMatch(JARGON);
    expect(howTodayLooks(FRIDAY).rahuKaal.label).not.toMatch(JARGON);
  });

  it("keeps every chip label short", () => {
    const { keywords } = JSON.parse(fs.readFileSync("data/timeline-keywords.json", "utf8"));
    expect(keywords).toHaveLength(30);
    for (const k of keywords) expect(k.label.length).toBeLessThanOrEqual(18);
  });

  it("uses the traditional term only when someone asks to go deeper", () => {
    expect(answerFromCorpus("What is Rahu Kaal?").answer).toContain("Rahu Kaal");
    expect(answerFromCorpus("Tell me about ketu").answer).toContain("Breather");
  });
});

describe("moments", () => {
  const moments = loadMoments();

  it("matches every suggested question to its own moment", () => {
    for (const m of moments) expect(matchMoment(m.question)?.id, m.question).toBe(m.id);
  });

  it.each([
    ["My boyfriend and I had a fight", "make-up"],
    ["should i double text him", "text-first"],
    ["when do I shoot my shot", "confess"],
    ["time to find a lover", "find-love"],
    ["is my situationship going anywhere", "the-talk"],
    ["planning a girls outing", "night-out"],
    ["I have a board exam tomorrow", "exam"],
    ["when should I start my business", "launch"],
    ["got a job interview friday", "interview"],
    ["good time for a date night", "romantic-vibe"],
  ])("%s → %s", (question, id) => {
    expect(matchMoment(question)?.id).toBe(id);
  });

  it("never promises outcomes or uses fear words", () => {
    const text = JSON.stringify(moments.map(({ label, question, lead, tips, note }) => [label, question, lead, tips, note]));
    expect(text).not.toMatch(/guarantee|will happen|you will|destiny|doomed|bad luck|curse/i);
    expect(text).not.toMatch(JARGON);
  });

  it("never picks a slot inside Breather time", () => {
    for (const m of moments) {
      const { today, week } = findBestTimes(m, FRIDAY, ["career"], "1991-03-14");
      for (const slot of [today, week]) {
        if (!slot) continue;
        const { rahuKaal } = buildDayTimeline(slot.date);
        expect(slot.hour + 1 <= rahuKaal.startHour || slot.hour >= rahuKaal.endHour, m.id).toBe(true);
      }
    }
  });

  it("gives an encouraging, jargon-free answer for every moment", () => {
    for (const m of moments) {
      const answer = answerMoment(m, FRIDAY, ["career"], "1991-03-14");
      expect(answer, m.id).toMatch(/AM|PM/);
      expect(answer).toContain("You've got this.");
      expect(answer).not.toMatch(JARGON);
    }
  });

  it("never tells someone to sit on a fight for days", () => {
    const m = matchMoment("we had a fight")!;
    const { week } = findBestTimes(m, FRIDAY, ["career"], "1991-03-14");
    const daysAway = (week!.date.getTime() - FRIDAY.getTime()) / 86_400_000;
    expect(daysAway).toBeLessThan(2);
  });

  it("reads naturally for every moment", () => {
    for (const m of moments) {
      expect(answerMoment(m, FRIDAY, ["career"], "")).toMatch(/best time( to get ready)? is /i);
    }
  });

  it("still finds a time late at night", () => {
    const late = new Date(2026, 9, 30, 23, 30);
    expect(answerMoment(matchMoment("first date")!, late, ["career"], "")).toMatch(/AM|PM/);
  });

  it("doesn't predict when asked about the future", () => {
    expect(answerFromCorpus("When can I find love?").answer).toContain("can't promise");
    expect(answerFromCorpus("When will I get a job?").answer).toContain("can't promise");
  });

  it("carries safety and money notes", () => {
    expect(answerFromCorpus("We had a big fight").answer).toContain("someone you trust");
    expect(answerFromCorpus("Should I buy crypto?").answer).toContain("qualified professional");
  });

  it("answers a crisis with care, not timing", () => {
    for (const q of ["I want to hurt myself", "my boyfriend hits me"]) {
      const { answer } = answerFromCorpus(q);
      expect(answer).toContain("helpline");
      expect(answer).not.toMatch(/best time/i);
    }
  });
});

describe("vibeAt", () => {
  const chip = (tone: string, startHour: number, endHour: number) => ({ label: "Chip", tone, startHour, endHour });
  const rail = {
    rahuKaal: { startHour: 10.5, endHour: 12 },
    chips: [chip("opportunity", 6, 9), chip("caution", 13, 15), chip("mood", 15, 18), chip("energy", 18, 21)],
  };

  it("reads each part of the day", () => {
    expect(vibeAt(rail, 7).word).toBe("Great vibe");
    expect(vibeAt(rail, 11).word).toBe("Breather time");
    expect(vibeAt(rail, 14).word).toBe("Take it easy");
    expect(vibeAt(rail, 16).word).toBe("Good to go");
    expect(vibeAt(rail, 3).word).toBe("Rest up");
  });

  it("finds the next best time", () => {
    expect(nextBestTime(rail, 14)).toEqual({ time: "6 PM", label: "Chip" });
    expect(nextBestTime(rail, 22)).toBeNull();
  });

  it("formats hours", () => {
    expect([formatHour(0), formatHour(9), formatHour(12), formatHour(16.5)]).toEqual(["12 AM", "9 AM", "12 PM", "4:30 PM"]);
  });
});
