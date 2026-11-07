/**
 * Timezone-safe event clock helpers.
 * Prefer the viewer's local timezone (browser). Google floating datetimes
 * without offset are treated as local wall-clock, not UTC.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_TZ = /Z$|[+-]\d{2}:\d{2}$/;
const FLOATING =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Parse Google date / dateTime into a Date in local interpretation. */
export function parseEventDate(isoOrDate: string): Date {
  if (!isoOrDate) return new Date(NaN);
  if (DATE_ONLY.test(isoOrDate)) {
    const [y, m, d] = isoOrDate.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  if (HAS_TZ.test(isoOrDate)) {
    return new Date(isoOrDate);
  }
  const m = isoOrDate.match(FLOATING);
  if (m) {
    return new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0),
      0
    );
  }
  return new Date(isoOrDate);
}

export function isAllDayEvent(isoOrDate: string): boolean {
  return DATE_ONLY.test(isoOrDate || "");
}

/** Local clock label — never force UTC. All-day → "All day". */
export function formatEventTime(isoOrDate: string): string {
  if (!isoOrDate) return "";
  if (isAllDayEvent(isoOrDate)) return "All day";
  const d = parseEventDate(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Compact hour for week/month cells, e.g. "12:30". */
export function formatEventTimeShort(isoOrDate: string): string {
  if (!isoOrDate) return "";
  if (isAllDayEvent(isoOrDate)) return "All day";
  const d = parseEventDate(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23", // hour12: false can print midnight as 24:00
  }).format(d);
}

/** Local fractional hour (0–24) for day-rail placement. */
export function localFractionalHour(isoOrDate: string): number {
  const d = parseEventDate(isoOrDate);
  if (Number.isNaN(d.getTime())) return 0;
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

/** Same calendar day in local TZ? */
export function isSameLocalDay(isoOrDate: string, day: Date): boolean {
  const d = parseEventDate(isoOrDate);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

/** Build local wall-clock ISO without Z for Google + timeZone. */
export function localWallDateTime(day: Date, hhmm: string): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const [hh, mm] = hhmm.split(":");
  return `${y}-${m}-${d}T${String(hh).padStart(2, "0")}:${String(mm || "00").padStart(2, "0")}:00`;
}
