"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  DayTimeline,
  type CalEvent,
} from "@/components/calendar/DayTimeline";
import { AddEventForm } from "@/components/calendar/AddEventForm";
import { DayBanner } from "@/components/DayBanner";
import { DayEnergy } from "@/components/calendar/DayEnergy";
import { Explain } from "@/components/Explain";
import { LeafSprig } from "@/components/Art";
import { KeywordChip } from "@/components/KeywordChip";
import { ReconnectBanner } from "@/components/ReconnectBanner";
import { RetryNote } from "@/components/RetryNote";
import { getJson } from "@/lib/api";
import { inferEventType } from "@/lib/eventType";
import { startsInBreather } from "@/lib/rail";
import { VIBE_WORDS, type VibeLabel } from "@/lib/vibes";
import {
  formatEventTimeShort,
  localFractionalHour,
  parseEventDate,
} from "@/lib/datetime";
import {
  ONBOARDING_SEEN_KEY,
  PROFILE_STORAGE_KEY,
  isProfileComplete,
  normalizeProfile,
} from "@/lib/profile";
import type { DayTimeline as DayTimelineData, EventTip } from "@/lib/timeline";

type View = "day" | "week" | "month";

function DomainPills({
  domains,
}: {
  domains: Array<{ domain: string; score: number; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {domains.map((d) => (
        <span
          key={d.domain}
          className="satro-domain-pill"
          title={VIBE_WORDS[d.label as VibeLabel]}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              d.label === "favored"
                ? "bg-cosmic"
                : d.label === "avoid"
                  ? "bg-solar"
                  : "bg-space/25"
            }`}
          />
          <span className="text-space/70">{d.domain}</span>
          <span
            className={`tabular-nums ${
              d.label === "favored"
                ? "text-cosmic"
                : d.label === "avoid"
                  ? "text-solar"
                  : "text-space/70"
            }`}
          >
            {d.score}
            <span className="text-space/70">/10</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [mode, setMode] = useState("mock");
  const [reason, setReason] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [timeline, setTimeline] = useState<DayTimelineData | null>(null);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [tip, setTip] = useState<EventTip | null>(null);
  const [profileOk, setProfileOk] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const range = useMemo(() => {
    if (view === "day") {
      const from = new Date(cursor);
      from.setHours(0, 0, 0, 0);
      const to = new Date(cursor);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    if (view === "week") {
      return { from: startOfWeek(cursor), to: endOfWeek(cursor) };
    }
    return {
      from: startOfWeek(startOfMonth(cursor)),
      to: endOfWeek(endOfMonth(cursor)),
    };
  }, [cursor, view]);

  const checkProfile = useCallback(() => {
    // The server copy decides: it is what the timeline is scored from.
    getJson("/api/profile")
      .then((d) => {
        const p = normalizeProfile(d.profile);
        if (isProfileComplete(p)) {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
          setName(p.displayName);
          setProfileOk(true);
          return;
        }
        setProfileOk(false);
        if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) router.replace("/onboarding");
      })
      .catch(() => setLoadFailed(true));
  }, [router]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  const loadEvents = useCallback(() => {
    const q = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    getJson(`/api/calendar/events?${q}`)
      .then((d) => {
        setEvents(d.events || []);
        setMode(d.mode || "mock");
        setReason(d.reason || "");
        setNeedsReauth(Boolean(d.needsReauth));
      })
      .catch(() => setLoadFailed(true));
  }, [range]);

  const loadTimeline = useCallback(() => {
    const date = format(cursor, "yyyy-MM-dd");
    getJson(`/api/timeline?date=${date}`)
      .then((d) => setTimeline(d.timeline || null))
      .catch(() => setLoadFailed(true));
  }, [cursor]);

  useEffect(() => {
    loadEvents();
    loadTimeline();
  }, [loadEvents, loadTimeline]);

  useEffect(() => {
    if (!selected || !timeline) {
      setTip(null);
      return;
    }
    setTip(null);
    const type = selected.type || inferEventType(selected.summary);
    const hour = localFractionalHour(selected.start);
    const endHour = localFractionalHour(selected.end) || hour + 1;
    getJson(
      `/api/timeline?date=${format(cursor, "yyyy-MM-dd")}&eventHour=${hour}&eventEndHour=${endHour}&eventType=${type}`
    )
      .then((d) => setTip(d.tip || null))
      .catch(() => setLoadFailed(true));
  }, [selected, timeline, cursor]);

  const days: Date[] = [];
  let d = new Date(range.from);
  while (d <= range.to) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  return (
    <div className="space-y-4 satro-fade-in">
      <DayBanner
        name={name}
        rail={isSameDay(cursor, new Date()) ? timeline : null}
      >
        <span
          title={reason || undefined}
          className={`satro-badge ${
            mode === "google"
              ? "satro-chip-opportunity"
              : "satro-chip-caution"
          }`}
        >
          {mode === "google" ? "Live" : "Mock"}
        </span>
      </DayBanner>
      {reason ? <p className="text-[13px] text-space/70">{reason}</p> : null}

      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="satro-segment w-full sm:w-auto">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={v === view}
              onClick={() => setView(v)}
              className="satro-segment-item"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="satro-btn-ghost satro-btn-sm"
          onClick={() =>
            setCursor(
              view === "month"
                ? addMonths(cursor, -1)
                : view === "day"
                  ? addDays(cursor, -1)
                  : addDays(cursor, -7)
            )
          }
          aria-label="Previous"
        >
          ←
        </button>
        <div className="min-w-[9.5rem] text-center text-sm font-medium tracking-tight">
          {view === "day"
            ? format(cursor, "EEE, MMM d")
            : format(cursor, "MMMM yyyy")}
        </div>
        <button
          type="button"
          className="satro-btn-ghost satro-btn-sm"
          onClick={() =>
            setCursor(
              view === "month"
                ? addMonths(cursor, 1)
                : view === "day"
                  ? addDays(cursor, 1)
                  : addDays(cursor, 7)
            )
          }
          aria-label="Next"
        >
          →
        </button>
        <button
          type="button"
          className="satro-btn-ghost satro-btn-sm ml-1"
          onClick={() => setCursor(new Date())}
        >
          Today
        </button>
      </div>

      {loadFailed && (
        <RetryNote
          onRetry={() => {
            setLoadFailed(false);
            checkProfile();
            loadEvents();
            loadTimeline();
          }}
        />
      )}
      {needsReauth && <ReconnectBanner />}

      {timeline?.rahuKaal?.label && (
        <div className="rounded-xl border border-solar/15 bg-solar/[0.06] px-3 py-2 text-xs text-space/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-solar/70" />
            <span className="flex-1 font-medium text-space/80">{timeline.rahuKaal.label}</span>
            <Explain id="breather" />
          </div>
        </div>
      )}

      {view === "day" && (
        <>
          {profileOk === false ? (
            <Link href="/profile" className="satro-card-tight flex items-center gap-3">
              <LeafSprig className="h-9 w-9 shrink-0 text-cosmic" />
              <span className="font-serif text-[17px] font-semibold text-space">
                Add your birth date to see today&apos;s chips
              </span>
            </Link>
          ) : timeline ? (
            <DomainPills domains={timeline.topDomains} />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="satro-skeleton h-6 w-20 rounded-full" />
              ))}
            </div>
          )}

          {profileOk && <DayEnergy date={cursor} />}

          <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4 lg:space-y-0">
          {timeline ? (
            <DayTimeline
              date={cursor}
              chips={profileOk === false ? [] : timeline.chips}
              events={events}
              rahuStart={timeline.rahuKaal?.startHour}
              rahuEnd={timeline.rahuKaal?.endHour}
              selectedEventId={selected?.id}
              onSelectEvent={setSelected}
              tip={tip}
              onDismissTip={() => {
                setTip(null);
                setSelected(null);
              }}
            />
          ) : (
            <div className="satro-card space-y-3 p-4">
              <div className="satro-skeleton h-4 w-40" />
              <div className="satro-skeleton h-64 w-full" />
            </div>
          )}

          <AddEventForm
            date={cursor}
            onCreated={(result, payload) => {
              const saved = (result as { event?: CalEvent | null }).event;
              const created: CalEvent = {
                id: saved?.id || `local-${Date.now()}`,
                summary: saved?.summary || payload.summary,
                start: saved?.start || payload.start,
                end: saved?.end || payload.end,
                source: saved?.source || "mock",
                satro: true,
                type: payload.type,
                hangoutLink: saved?.hangoutLink,
              };
              // Show it now; the refetch then confirms it.
              setEvents((prev) => [...prev.filter((e) => e.id !== created.id), created]);
              setSelected(created);
              loadEvents();
            }}
          />
          </div>
        </>
      )}

      {view !== "day" && (
        <div
          className={`grid gap-1.5 sm:gap-2 ${
            view === "week" ? "grid-cols-1 sm:grid-cols-7" : "grid-cols-7"
          }`}
        >
          {days.map((day) => {
            const dayEvents = events.filter((e) =>
              isSameDay(parseEventDate(e.start), day)
            );
            const breatherClash = dayEvents.some((e) => startsInBreather(e.start, day));
            const weekRow = view === "week";
            return (
              <button
                key={day.toISOString()}
                type="button"
                aria-label={`${format(day, "EEEE, MMMM d")}, ${dayEvents.length} events${
                  breatherClash ? ", one during Breather time" : ""
                }`}
                onClick={() => {
                  setCursor(day);
                  setView("day");
                }}
                className={`rounded-xl bg-orbit-card p-1.5 text-left shadow-satro transition active:scale-[0.98] sm:min-h-[110px] sm:rounded-2xl sm:p-2.5 ${
                  weekRow ? "min-h-14 p-3" : "min-h-14"
                } ${!isSameMonth(day, cursor) && !weekRow ? "opacity-40" : ""} ${
                  isSameDay(day, new Date()) ? "ring-2 ring-cosmic/50" : ""
                }`}
              >
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-space/70 sm:text-xs">
                  {format(day, weekRow ? "EEE d" : "d")}
                  {breatherClash && (
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-solar" />
                  )}
                </div>
                {/* Month cells are too narrow for titles on phones, so show dots. */}
                {!weekRow && dayEvents.length > 0 && (
                  <div aria-hidden="true" className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 4).map((e) => (
                      <span
                        key={e.id}
                        className={`h-1.5 w-1.5 rounded-full ${e.satro ? "bg-cosmic" : "bg-space/30"}`}
                      />
                    ))}
                  </div>
                )}
                <ul className={`space-y-1 ${weekRow ? "" : "hidden sm:block"}`}>
                  {dayEvents.slice(0, 3).map((e) => (
                    <li
                      key={e.id}
                      className={`truncate rounded-lg px-1.5 py-0.5 text-xs ${
                        e.satro
                          ? "bg-cosmic/15 text-cosmic"
                          : "bg-orbit-muted text-space"
                      }`}
                    >
                      {formatEventTimeShort(e.start)} {e.summary}
                    </li>
                  ))}
                  {dayEvents.length > 3 && (
                    <li className="px-1.5 text-[11px] text-space/70">
                      +{dayEvents.length - 3} more
                    </li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-space/70">
        Traditional / symbolic entertainment guidance — keyword chips are not
        predictive certainty or medical/financial advice.
        {profileOk && timeline?.chips && timeline.chips.length > 0 && (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-space/70">Sample:</span>
            {timeline.chips.slice(0, 3).map((c) => (
              <KeywordChip key={c.id} label={c.label} tone={c.tone} compact />
            ))}
          </span>
        )}
      </p>
    </div>
  );
}
