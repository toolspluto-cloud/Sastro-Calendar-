import { loadJson, MeetingPrepRules } from "./data";
import { lifePathFromBirthDate, lifePathMeta, nameNumber } from "./numerology";

export type PersonInput = {
  name: string;
  birthDate: string; // YYYY-MM-DD
};

export type PrepResult = {
  you: { name: string; lifePath: number; expression: number; theme: string };
  them: { name: string; lifePath: number; expression: number; theme: string };
  tips: string[];
  disclaimer: string;
};

function tipsForLifePath(targetLp: number, rules: MeetingPrepRules): string[] {
  const tips: string[] = [];
  const map: Record<number, string> = {
    1: "life_path_1_counterpart",
    2: "life_path_2_or_6_counterpart",
    3: "life_path_3_counterpart",
    4: "life_path_4_counterpart",
    5: "life_path_5_counterpart",
    6: "life_path_2_or_6_counterpart",
    7: "life_path_7_counterpart",
    8: "life_path_8_counterpart",
    9: "life_path_9_counterpart",
  };
  const key = map[targetLp] || map[reduceSimple(targetLp)];
  for (const rule of rules.rule_engine) {
    if (rule.if === key && rule.emit) tips.push(rule.emit);
  }
  // Always add a few general tips
  for (const rule of rules.rule_engine) {
    if (
      rule.emit &&
      (rule.if === "compatible_elements" ||
        rule.if === "same_quality == Fixed" ||
        rule.if === "weekday_affinity_overlap")
    ) {
      tips.push(rule.emit);
    }
  }
  return tips;
}

function reduceSimple(n: number) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  if (n === 11) return 2;
  if (n === 22) return 4;
  if (n === 33) return 6;
  return n;
}

export function comparePeople(you: PersonInput, them: PersonInput): PrepResult {
  const rules = loadJson<MeetingPrepRules>("meeting-prep-rules.json");
  const youLp = lifePathFromBirthDate(you.birthDate);
  const themLp = lifePathFromBirthDate(them.birthDate);
  const youMeta = lifePathMeta(youLp);
  const themMeta = lifePathMeta(themLp);

  const tips: string[] = [];
  if (youLp === themLp) {
    tips.push(
      "Open with shared values and a story they will recognize; same Life Path often means familiar motivation — still verify assumptions aloud."
    );
  }
  tips.push(...tipsForLifePath(themLp, rules));

  // Cap at 5 practical tips
  const capped = tips.filter(Boolean).slice(0, 5);
  while (capped.length < 3) {
    capped.push(
      "Prefer scheduling on Mercury/Jupiter/Venus-friendly weekdays (Wed/Thu/Fri) when calendars allow."
    );
    if (capped.length >= 5) break;
  }

  capped.push("Traditional/symbolic guidance — not predictive certainty.");

  return {
    you: {
      name: you.name,
      lifePath: youLp,
      expression: nameNumber(you.name),
      theme: youMeta.theme,
    },
    them: {
      name: them.name,
      lifePath: themLp,
      expression: nameNumber(them.name),
      theme: themMeta.theme,
    },
    tips: capped.slice(0, 6),
    disclaimer:
      rules.commercial_flags?.[0] ||
      "Traditional/symbolic guidance for entertainment/education.",
  };
}
