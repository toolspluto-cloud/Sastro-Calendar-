export type Rashi = {
  num: number;
  sanskrit: string;
  english: string;
  lord: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  quality: "Movable" | "Fixed" | "Dual";
};

/** First day of each sign, in calendar order. Dhanu wraps across New Year. */
const SIGNS: Array<{ month: number; day: number; rashi: Rashi }> = [
  { month: 1, day: 14, rashi: { num: 10, sanskrit: "Makara", english: "Capricorn", lord: "Saturn", element: "Earth", quality: "Movable" } },
  { month: 2, day: 13, rashi: { num: 11, sanskrit: "Kumbha", english: "Aquarius", lord: "Saturn", element: "Air", quality: "Fixed" } },
  { month: 3, day: 14, rashi: { num: 12, sanskrit: "Meena", english: "Pisces", lord: "Jupiter", element: "Water", quality: "Dual" } },
  { month: 4, day: 14, rashi: { num: 1, sanskrit: "Mesha", english: "Aries", lord: "Mars", element: "Fire", quality: "Movable" } },
  { month: 5, day: 15, rashi: { num: 2, sanskrit: "Vrishabha", english: "Taurus", lord: "Venus", element: "Earth", quality: "Fixed" } },
  { month: 6, day: 15, rashi: { num: 3, sanskrit: "Mithuna", english: "Gemini", lord: "Mercury", element: "Air", quality: "Dual" } },
  { month: 7, day: 16, rashi: { num: 4, sanskrit: "Karka", english: "Cancer", lord: "Moon", element: "Water", quality: "Movable" } },
  { month: 8, day: 17, rashi: { num: 5, sanskrit: "Simha", english: "Leo", lord: "Sun", element: "Fire", quality: "Fixed" } },
  { month: 9, day: 17, rashi: { num: 6, sanskrit: "Kanya", english: "Virgo", lord: "Mercury", element: "Earth", quality: "Dual" } },
  { month: 10, day: 17, rashi: { num: 7, sanskrit: "Tula", english: "Libra", lord: "Venus", element: "Air", quality: "Movable" } },
  { month: 11, day: 16, rashi: { num: 8, sanskrit: "Vrishchika", english: "Scorpio", lord: "Mars", element: "Water", quality: "Fixed" } },
  { month: 12, day: 16, rashi: { num: 9, sanskrit: "Dhanu", english: "Sagittarius", lord: "Jupiter", element: "Fire", quality: "Dual" } },
];

/**
 * Sidereal sun sign by birth date. An approximation with no ephemeris;
 * label it "Sun sign (sidereal, approx.)" wherever it is shown.
 */
export function rashiFromBirthDate(isoDate: string): Rashi {
  const [, month, day] = isoDate.split("-").map(Number);
  if (!month || !day) throw new Error("Invalid birth date");
  const started = SIGNS.filter(
    (s) => month > s.month || (month === s.month && day >= s.day)
  );
  return (started[started.length - 1] ?? SIGNS[SIGNS.length - 1]).rashi;
}
