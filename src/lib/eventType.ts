export const EVENT_TYPES = ["meeting", "gym", "finance", "doctor", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Keyword inference for events with no stored type. Safe to import on the client. */
export function inferEventType(summary: string): EventType {
  const s = summary.toLowerCase();
  if (/\b(gym|workout|run|running|yoga)\b/.test(s)) return "gym"; // "run" must not match "brunch"
  if (/finance|budget|invoice|bank|tax|investor/.test(s)) return "finance";
  if (/doctor|dentist|clinic|hospital|checkup/.test(s)) return "doctor";
  if (/lunch|dinner|break/.test(s)) return "other";
  return "meeting";
}

/** A stored or requested type when valid, otherwise inferred from the title. */
export function resolveEventType(raw: unknown, summary: string): EventType {
  return EVENT_TYPES.find((t) => t === raw) ?? inferEventType(summary);
}
