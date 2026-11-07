export const PROFILE_STORAGE_KEY = "satro.profile";
export const ONBOARDING_SEEN_KEY = "satro.onboarding.seen";

export const ALL_DOMAINS = [
  "career",
  "money",
  "health",
  "social",
  "romance",
  "focus",
  "travel",
  "family",
  "creativity",
  "rest",
] as const;

export type Domain = (typeof ALL_DOMAINS)[number];

export type UserProfile = {
  displayName: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  currentTimeZone?: string; // IANA, e.g. "Asia/Kolkata"; default browser TZ
  preferredDomains: Domain[]; // ordered by priority, min 1
  notificationCadence?: "off" | "daily";
  selectedCalendarIds?: string[]; // default ["primary"]
};

export const EMPTY_PROFILE: UserProfile = {
  displayName: "",
  birthDate: "",
  birthTime: "",
  birthPlace: "",
  preferredDomains: ["career"],
};

export function isProfileComplete(p: Partial<UserProfile> | null | undefined): boolean {
  if (!p) return false;
  return Boolean(p.displayName?.trim() && p.birthDate?.trim());
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isRealPastDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  const roundTrips = parsed.toISOString().slice(0, 10) === iso;
  return roundTrips && y >= 1900 && parsed.getTime() <= Date.now() + 86_400_000;
}

/** Why a profile can't be saved, or null when it can. */
export function profileError(p: UserProfile): string | null {
  if (!isProfileComplete(p)) return "displayName and birthDate are required";
  if (!isRealPastDate(p.birthDate)) return "Enter a real birth date that isn't in the future.";
  return null;
}

/** Toggle a domain, keeping selection order as priority. Never empties the list. */
export function toggleDomain(selected: Domain[], domain: Domain): Domain[] {
  if (!selected.includes(domain)) return [...selected, domain];
  return selected.length > 1 ? selected.filter((d) => d !== domain) : selected;
}

export function normalizeProfile(raw: unknown): UserProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const domains = Array.isArray(r.preferredDomains)
    ? (r.preferredDomains as string[]).filter((d): d is Domain =>
        (ALL_DOMAINS as readonly string[]).includes(d)
      )
    : [];
  // Legacy key "name" from MVP
  const displayName = String(r.displayName || r.name || "").trim();
  const timeZone = String(r.currentTimeZone || "").trim();
  const calendarIds = Array.isArray(r.selectedCalendarIds)
    ? r.selectedCalendarIds.map(String)
    : [];
  return {
    displayName,
    birthDate: String(r.birthDate || "").trim(),
    birthTime: String(r.birthTime || "").trim(),
    birthPlace: String(r.birthPlace || "").trim(),
    preferredDomains: domains.length > 0 ? Array.from(new Set(domains)) : ["career"],
    ...(timeZone && isValidTimeZone(timeZone) ? { currentTimeZone: timeZone } : {}),
    notificationCadence: r.notificationCadence === "daily" ? "daily" : "off",
    ...(calendarIds.length > 0 ? { selectedCalendarIds: calendarIds } : {}),
  };
}
