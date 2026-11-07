"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DomainMultiSelect } from "@/components/DomainMultiSelect";
import { TimeZoneSelect } from "@/components/TimeZoneSelect";
import { browserTimeZone } from "@/lib/datetime";
import {
  EMPTY_PROFILE,
  type UserProfile,
} from "@/lib/profile";
import { loadProfile, saveProfile } from "@/lib/profileClient";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>({ ...EMPTY_PROFILE });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((p) => {
      if (cancelled) return;
      setProfile(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!profile.displayName.trim() || !profile.birthDate) {
      setError("Add your name and birth date to continue.");
      return;
    }
    const result = await saveProfile(profile);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProfile(result.profile);
    setSaved(true);
    setTimeout(() => router.push("/calendar"), 800);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 satro-fade-in">
        <div className="satro-skeleton h-7 w-48" />
        <div className="satro-skeleton h-4 w-full" />
        <div className="satro-card space-y-3">
          <div className="satro-skeleton h-10 w-full" />
          <div className="satro-skeleton h-10 w-full" />
          <div className="satro-skeleton h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 satro-fade-in">
      <div>
        <h1 className="satro-page-title">Your birth profile</h1>
        <p className="satro-page-sub">
          This places your chips on the day timeline. Only your name and birth
          date are required.
        </p>
      </div>

      <form onSubmit={save} noValidate className="satro-card space-y-3.5">
        <label className="satro-label">
          Display name <span className="text-solar">*</span>
          <input
            className="satro-input mt-1"
            value={profile.displayName}
            onChange={(e) =>
              setProfile({ ...profile, displayName: e.target.value })
            }
            placeholder="How Satro addresses you"
          />
        </label>
        <label className="satro-label">
          Birth date <span className="text-solar">*</span>
          <input
            className="satro-input mt-1"
            type="date"
            value={profile.birthDate}
            onChange={(e) =>
              setProfile({ ...profile, birthDate: e.target.value })
            }
          />
        </label>
        <label className="satro-label">
          Time of birth
          <input
            className="satro-input mt-1"
            type="time"
            value={profile.birthTime}
            onChange={(e) =>
              setProfile({ ...profile, birthTime: e.target.value })
            }
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
            onChange={(e) =>
              setProfile({ ...profile, birthPlace: e.target.value })
            }
          />
        </label>
        <TimeZoneSelect
          value={profile.currentTimeZone || browserTimeZone()}
          onChange={(currentTimeZone) => setProfile({ ...profile, currentTimeZone })}
        />

        <fieldset>
          <legend className="satro-section-title mb-2">Life domains</legend>
          <DomainMultiSelect
            value={profile.preferredDomains}
            onChange={(preferredDomains) =>
              setProfile({ ...profile, preferredDomains })
            }
          />
        </fieldset>

        <label className="flex min-h-11 items-center justify-between gap-3 text-[15px] text-space">
          Daily best-hour nudge
          <input
            type="checkbox"
            checked={profile.notificationCadence === "daily"}
            onChange={(e) =>
              setProfile({
                ...profile,
                notificationCadence: e.target.checked ? "daily" : "off",
              })
            }
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-solar">
            {error}
          </p>
        )}
        <button type="submit" className="satro-btn-primary w-full">
          Save & open Day calendar
        </button>
        {saved && (
          <p role="status" className="text-sm text-cosmic">
            Saved — opening Day view…
          </p>
        )}
      </form>

      <div className="satro-card-tight text-sm text-space/70">
        <h2 className="mb-1 satro-section-title">Photo privacy</h2>
        <p className="text-[13px] leading-relaxed">
          Satro doesn&apos;t keep biometric images: photos (if ever used) are
          deleted after analysis.
        </p>
      </div>
    </div>
  );
}
