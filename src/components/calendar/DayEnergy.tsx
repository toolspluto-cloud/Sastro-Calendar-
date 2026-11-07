"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ScoreRing } from "@/components/ScoreRing";
import { getJson } from "@/lib/api";
import type { DayScores } from "@/lib/scoring";

const CHANNELS = [
  { key: "work", label: "Work" },
  { key: "meetings", label: "Meetings" },
  { key: "rest", label: "Rest" },
  { key: "socializing", label: "Friends" },
] as const;

/** Collapsible day-level scores. It only loads once someone opens it. */
export function DayEnergy({ date }: { date: Date }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DayScores | null>(null);
  const [failed, setFailed] = useState(false);
  const day = format(date, "yyyy-MM-dd");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    getJson<DayScores>(`/api/scores?date=${day}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, day]);

  return (
    <section className="satro-card-tight">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="day-energy"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 w-full items-center justify-between text-left"
      >
        <h2 className="satro-section-title">Day energy</h2>
        <span className="text-[13px] font-semibold text-cosmic">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div id="day-energy" className="mt-3 space-y-3">
          {failed && <p className="text-sm text-space/70">Satro can&apos;t connect right now.</p>}
          {!data && !failed && <div className="satro-skeleton h-24 w-full" />}
          {data && (
            <>
              <div className="grid grid-cols-4 gap-1">
                {CHANNELS.map(({ key, label }) => (
                  <ScoreRing
                    key={key}
                    label={label}
                    score={data.channels[key]}
                    tone={data.labels[key]}
                  />
                ))}
              </div>
              <p className="text-[15px] font-medium text-space">{data.bestHourHint}</p>
              <ul className="space-y-1 text-[13px] text-space/70">
                {data.flags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
