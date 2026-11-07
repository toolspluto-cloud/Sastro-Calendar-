import fs from "fs";
import path from "path";
import { learnedAdjustments, type FeedbackEntry } from "./feedback";
import { EMPTY_PROFILE, normalizeProfile, type UserProfile } from "./profile";

/**
 * Where personal runtime files live. Hosted servers such as Vercel can only write
 * to /tmp, which is wiped from time to time, so saved data there is temporary.
 */
export function runtimeFile(name: string) {
  const dir = process.env.VERCEL ? path.join("/tmp", "satro") : path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

const PROFILE_PATH = runtimeFile("user-profile.json");
const FEEDBACK_PATH = runtimeFile("feedback.json");

export function readProfile(): UserProfile {
  try {
    return normalizeProfile(JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8")));
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function writeProfile(profile: UserProfile) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
}

export function readFeedback(): FeedbackEntry[] {
  try {
    const { entries } = JSON.parse(fs.readFileSync(FEEDBACK_PATH, "utf8"));
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export function writeFeedback(entries: FeedbackEntry[]) {
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify({ entries }, null, 2));
}

export function readAdjustments() {
  return learnedAdjustments(readFeedback());
}
