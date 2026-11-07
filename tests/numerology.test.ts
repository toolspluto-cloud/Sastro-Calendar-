import { describe, expect, it } from "vitest";
import {
  lifePathFromBirthDate,
  lifePathMeta,
  nameNumber,
  personalDay,
  personalMonth,
  personalYear,
} from "../src/lib/numerology";
import { rashiFromBirthDate } from "../src/lib/zodiac";

describe("numerology", () => {
  it("computes Life Path with the spec example", () => {
    expect(lifePathFromBirthDate("1991-03-14")).toBe(1);
  });

  it("keeps master numbers", () => {
    // 2 + 9 + (1+9+9+0=19→1) = 12→3: an ordinary reduction.
    expect(lifePathFromBirthDate("1990-02-09")).toBe(3);
    // 11 + 9 + (18→9) = 29→11 stays a master.
    expect(lifePathFromBirthDate("1980-11-09")).toBe(11);
  });

  it("has theme data for every Life Path, including masters", () => {
    for (const lp of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) {
      expect(lifePathMeta(lp).theme).not.toBe("General path");
    }
  });

  it("scores names with Pythagorean values", () => {
    // M4 A1 Y7 A1 R9 A1 O6 = 29 → 11, kept as a master.
    expect(nameNumber("MAYA RAO")).toBe(11);
  });

  it("reduces personal year, month and day to 1–9", () => {
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 28; day++) {
        const py = personalYear("1991-03-14", 2026);
        const pm = personalMonth("1991-03-14", 2026, month);
        const pd = personalDay("1991-03-14", 2026, month, day);
        for (const n of [py, pm, pd]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(9);
        }
      }
    }
  });

  it("computes a worked personal cycle", () => {
    // 3 + 5 + (2026→10→1) = 9; 9 + 10 = 19→1; 1 + 30 = 31→4.
    expect(personalYear("1991-03-14", 2026)).toBe(9);
    expect(personalMonth("1991-03-14", 2026, 10)).toBe(1);
    expect(personalDay("1991-03-14", 2026, 10, 30)).toBe(4);
  });
});

describe("rashiFromBirthDate", () => {
  it.each([
    ["1990-05-15", "Vrishabha", "Venus"],
    ["2000-01-10", "Dhanu", "Jupiter"],
    ["2000-01-14", "Makara", "Saturn"],
    ["2000-12-15", "Vrishchika", "Mars"],
    ["2000-12-16", "Dhanu", "Jupiter"],
    ["2000-04-13", "Meena", "Jupiter"],
    ["2000-04-14", "Mesha", "Mars"],
    ["2000-08-17", "Simha", "Sun"],
    ["2000-07-15", "Mithuna", "Mercury"],
    ["2000-07-16", "Karka", "Moon"],
    ["2000-02-29", "Kumbha", "Saturn"],
  ])("%s → %s / %s", (date, name, lord) => {
    const r = rashiFromBirthDate(date);
    expect(r.sanskrit).toBe(name);
    expect(r.lord).toBe(lord);
  });

  it("rejects an invalid date", () => {
    expect(() => rashiFromBirthDate("")).toThrow();
  });
});
