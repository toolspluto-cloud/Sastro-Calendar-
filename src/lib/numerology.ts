import { loadJson, NumerologyData } from "./data";

function reduceKeepMasters(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

function reduceDigits(n: number): number {
  while (n > 9) {
    n = String(n)
      .split("")
      .reduce((a, d) => a + Number(d), 0);
  }
  return n;
}

/** Life Path from YYYY-MM-DD using Pythagorean rules (keep masters on parts). */
export function lifePathFromBirthDate(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid birth date");
  const month = reduceKeepMasters(m);
  const day = reduceKeepMasters(d);
  const year = reduceKeepMasters(
    String(y)
      .split("")
      .reduce((a, dig) => a + Number(dig), 0)
  );
  return reduceKeepMasters(month + day + year);
}

export function nameNumber(
  name: string,
  system: "pythagorean" | "chaldean" = "pythagorean"
): number {
  const data = loadJson<NumerologyData>("numerology.json");
  const chart = data.letter_values_az[system];
  const sum = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((a, ch) => a + (chart[ch] || 0), 0);
  return reduceKeepMasters(sum);
}

export function lifePathMeta(lp: number) {
  const data = loadJson<NumerologyData>("numerology.json");
  return (
    data.lucky_unlucky_popular_practice.by_life_path.find(
      (x) => x.life_path === lp
    ) || {
      life_path: lp,
      lucky: [] as number[],
      unlucky: [] as number[],
      theme: "General path",
    }
  );
}

export function personalYear(isoDate: string, calendarYear: number): number {
  const [, m, d] = isoDate.split("-").map(Number);
  return reduceDigits(reduceDigits(m) + reduceDigits(d) + reduceDigits(calendarYear));
}

export function personalMonth(isoDate: string, calendarYear: number, month: number): number {
  return reduceDigits(personalYear(isoDate, calendarYear) + month);
}

export function personalDay(
  isoDate: string,
  calendarYear: number,
  month: number,
  day: number
): number {
  return reduceDigits(personalMonth(isoDate, calendarYear, month) + day);
}
