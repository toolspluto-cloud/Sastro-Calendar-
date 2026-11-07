"use client";

import { useState } from "react";
import { browserTimeZone, localWallDateTime } from "@/lib/datetime";
import { inferEventType } from "@/lib/eventType";
import { startsInBreather } from "@/lib/rail";

export type NewEventPayload = {
  summary: string;
  start: string;
  end: string;
  withMeet: boolean;
  type: string;
  timeZone?: string;
};

const TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "gym", label: "Gym" },
  { value: "finance", label: "Finance" },
  { value: "doctor", label: "Doctor" },
  { value: "other", label: "Other" },
];

function addHour(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AddEventForm({
  date,
  onCreated,
}: {
  date: Date;
  onCreated: (result: unknown, payload: NewEventPayload) => void;
}) {
  const [summary, setSummary] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  // The type follows the title until the person picks one themselves.
  const [pickedType, setPickedType] = useState("");
  const type = pickedType || inferEventType(summary);
  const [withMeet, setWithMeet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    if (!summary.trim()) {
      setError("Give your event a name.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time needs to be after the start.");
      return;
    }
    setBusy(true);
    setError("");
    const tz = browserTimeZone();
    const start = localWallDateTime(date, startTime);
    const end = localWallDateTime(date, endTime);
    const payload: NewEventPayload = {
      summary: summary.trim(),
      start,
      end,
      withMeet,
      type,
      timeZone: tz,
    };
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok && data.error) {
        setError(data.error);
      } else {
        setSummary("");
        setPickedType("");
        if (data.mode === "simulated") setNotice(data.message || "");
        onCreated(data, payload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="satro-card-tight space-y-3 satro-fade-in lg:sticky lg:top-20"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div>
          <h2 className="satro-section-title">Add event</h2>
          <p className="text-[11px] text-space/70">
            Pushes to Google when connected · {browserTimeZone()}
          </p>
        </div>
        <span className="text-[13px] font-semibold text-cosmic">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <>
          <label className="satro-label">
            Title
            <input
              className="satro-input mt-1"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Gym, coffee date, pitch…"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="satro-label">
              Start
              <input
                className="satro-input mt-1"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (endTime <= e.target.value) setEndTime(addHour(e.target.value));
                }}
              />
            </label>
            <label className="satro-label">
              End
              <input
                className="satro-input mt-1"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <div role="group" aria-label="Event type" className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={type === t.value}
                onClick={() => setPickedType(t.value)}
                className={`min-h-10 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95 ${
                  type === t.value
                    ? "bg-cosmic text-on-cosmic"
                    : "bg-orbit-muted/70 text-space/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="flex min-h-11 items-center justify-between gap-3 text-[15px] text-space">
            Add Google Meet link
            <input
              type="checkbox"
              checked={withMeet}
              onChange={(e) => setWithMeet(e.target.checked)}
            />
          </label>

          {startsInBreather(localWallDateTime(date, startTime), date) && (
            <p className="text-[13px] text-space/70">
              This starts in Breather time. Great for wrapping up, or go gentle.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-solar">
              {error}
            </p>
          )}
          {notice && <p className="text-[13px] text-space/70">{notice}</p>}

          <button
            type="submit"
            className="satro-btn-primary w-full"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create event"}
          </button>
        </>
      )}
    </form>
  );
}
