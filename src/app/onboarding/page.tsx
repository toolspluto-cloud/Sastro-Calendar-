"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { MeditatorLine, WatercolorScene, type ScenePalette } from "@/components/Art";
import { DomainMultiSelect } from "@/components/DomainMultiSelect";
import { TimeZoneSelect } from "@/components/TimeZoneSelect";
import { browserTimeZone } from "@/lib/datetime";
import {
  EMPTY_PROFILE,
  ONBOARDING_SEEN_KEY,
  type UserProfile,
} from "@/lib/profile";
import { loadProfile, saveProfile } from "@/lib/profileClient";

const STEPS: Array<{ title: string; sub: string; palette: ScenePalette }> = [
  { title: "Hello there", sub: "What should your guide call you?", palette: "dawn" },
  { title: "Your birth details", sub: "Only the date is required.", palette: "day" },
  { title: "What matters most?", sub: "Your day leads with these.", palette: "dusk" },
  { title: "Bring your calendar", sub: "See your real day, with tips on each event.", palette: "day" },
  { title: "You're all set", sub: "Your day is ready.", palette: "hero" },
];
const LAST_STEP = STEPS.length - 1;
const CONNECT_STEP = 3;

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [step, setStep] = useState(0);
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      /* private mode */
    }
    // Google sign-in leaves the page, so it returns here with ?step=.
    const resume = Number(new URLSearchParams(window.location.search).get("step"));
    if (resume >= 1 && resume <= LAST_STEP) setStep(resume);
    Promise.all([
      loadProfile(),
      fetch("/api/config").then((r) => r.json()).catch(() => ({})),
    ]).then(([p, config]) => {
      setProfile(p);
      setGoogleConfigured(Boolean(config.googleConfigured) && !config.mockForced);
      setReady(true);
    });
  }, []);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (step === 0 && !profile.displayName.trim()) {
      setError("Add a name so your guide can greet you.");
      return;
    }
    if (step === 1 && !profile.birthDate) {
      setError("Add your birth date to place your chips.");
      return;
    }
    // Save before the Google step, which navigates away.
    if (step === 2) {
      setBusy(true);
      const result = await saveProfile(profile);
      setBusy(false);
      if (result.error) {
        setError(result.error);
        setStep(1);
        return;
      }
      setProfile(result.profile);
    }
    setStep(step + 1);
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg space-y-3 satro-fade-in">
        <div className="satro-skeleton h-36 w-full rounded-[24px]" />
        <div className="satro-card space-y-3">
          <div className="satro-skeleton h-7 w-48" />
          <div className="satro-skeleton h-11 w-full" />
        </div>
      </div>
    );
  }

  const { title, sub, palette } = STEPS[step];
  const connected = status === "authenticated" && !session?.error;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="relative h-36 overflow-hidden rounded-[24px] shadow-satro">
        <WatercolorScene palette={palette} className="absolute inset-0 h-full w-full" />
        {step === LAST_STEP && (
          <MeditatorLine className="absolute inset-x-0 top-3 mx-auto h-28 w-28 text-white" />
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        className="flex justify-center gap-1.5"
      >
        {STEPS.map((s, i) => (
          <span
            key={s.title}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-cosmic" : i < step ? "w-1.5 bg-cosmic/50" : "w-1.5 bg-space/15"
            }`}
          />
        ))}
      </div>

      <form key={step} onSubmit={next} noValidate className="satro-card space-y-4 satro-fade-in">
        <div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-space">{title}</h1>
          <p className="satro-page-sub">{sub}</p>
        </div>

        {step === 0 && (
          <label className="satro-label">
            Display name
            <input
              className="satro-input mt-1"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              placeholder="Your name"
              autoFocus
            />
          </label>
        )}

        {step === 1 && (
          <>
            <label className="satro-label">
              Birth date
              <input
                className="satro-input mt-1"
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
              />
            </label>
            <label className="satro-label">
              Time of birth
              <input
                className="satro-input mt-1"
                type="time"
                value={profile.birthTime}
                onChange={(e) => setProfile({ ...profile, birthTime: e.target.value })}
              />
              <span className="mt-1 block text-xs text-space/70">
                Optional — timing is stronger with it.
              </span>
            </label>
            <label className="satro-label">
              Place of birth
              <input
                className="satro-input mt-1"
                placeholder="City, country"
                value={profile.birthPlace}
                onChange={(e) => setProfile({ ...profile, birthPlace: e.target.value })}
              />
            </label>
            <TimeZoneSelect
              value={profile.currentTimeZone || browserTimeZone()}
              onChange={(currentTimeZone) => setProfile({ ...profile, currentTimeZone })}
            />
          </>
        )}

        {step === 2 && (
          <DomainMultiSelect
            value={profile.preferredDomains}
            onChange={(preferredDomains) => setProfile({ ...profile, preferredDomains })}
          />
        )}

        {step === CONNECT_STEP && (
          <p className="text-[15px] leading-relaxed text-space/70">
            {connected
              ? `Connected${session?.user?.email ? ` as ${session.user.email}` : ""}.`
              : googleConfigured
                ? "Satro only reads your events and adds the ones you create here."
                : "Google isn't set up yet, so Satro will show sample events with a Mock badge."}
          </p>
        )}

        {step === LAST_STEP && (
          <p className="text-[15px] leading-relaxed text-space/70">
            Take a look around, {profile.displayName}. You can change any of this
            in Profile.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-solar">
            {error}
          </p>
        )}

        {step === LAST_STEP ? (
          <Link href="/calendar" className="satro-btn-primary w-full">
            Open your day
          </Link>
        ) : step === CONNECT_STEP && googleConfigured && !connected ? (
          <button
            type="button"
            className="satro-btn-primary w-full"
            onClick={() => signIn("google", { callbackUrl: `/onboarding?step=${LAST_STEP}` })}
          >
            Connect Google Calendar
          </button>
        ) : (
          <button type="submit" className="satro-btn-primary w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </button>
        )}

        {step < LAST_STEP && (
          <div className="flex justify-between text-[13px] font-semibold">
            {step > 0 ? (
              <button
                type="button"
                className="min-h-10 text-space/70"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {step === CONNECT_STEP ? (
              <button
                type="button"
                className="min-h-10 text-cosmic"
                onClick={() => setStep(LAST_STEP)}
              >
                Skip for now
              </button>
            ) : (
              <Link href="/calendar" className="flex min-h-10 items-center text-cosmic">
                Skip for now
              </Link>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
