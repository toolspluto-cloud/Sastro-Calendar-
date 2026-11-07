import { browserTimeZone } from "./datetime";
import {
  EMPTY_PROFILE,
  PROFILE_STORAGE_KEY,
  normalizeProfile,
  type UserProfile,
} from "./profile";

function storedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Server profile, falling back to the browser copy, with the browser timezone as default. */
export async function loadProfile(): Promise<UserProfile> {
  let profile: UserProfile = { ...EMPTY_PROFILE };
  try {
    const res = await fetch("/api/profile");
    profile = normalizeProfile((await res.json()).profile);
  } catch {
    /* use the browser copy below */
  }
  if (!profile.birthDate) profile = storedProfile() ?? profile;
  return { ...profile, currentTimeZone: profile.currentTimeZone || browserTimeZone() };
}

/** POST the profile; mirror to localStorage only once the server accepts it. */
export async function saveProfile(
  profile: UserProfile
): Promise<{ profile: UserProfile; error?: string }> {
  try {
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) return { profile, error: data.error || "Could not save." };
    const saved = normalizeProfile(data.profile);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* private mode: the server copy still counts */
    }
    return { profile: saved };
  } catch {
    return { profile, error: "Couldn't reach Satro. Try again." };
  }
}
