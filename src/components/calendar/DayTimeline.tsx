"use client";

import { useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import { LeafSprig } from "@/components/Art";
import { KeywordChip } from "@/components/KeywordChip";
import { EventTipSheet } from "@/components/calendar/EventTipSheet";
import {
  formatEventTime,
  isSameLocalDay,
} from "@/lib/datetime";
import { RAIL_END, RAIL_HEIGHT, RAIL_START, ROW, hourTop, layoutChips, layoutEvents } from "@/lib/rail";
import type { TimedChip, EventTip } from "@/lib/timeline";

export type CalEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  source: string;
  satro?: boolean;
  hangoutLink?: string;
  type?: string;
};

const HOURS = Array.from({ length: RAIL_END - RAIL_START }, (_, i) => i + RAIL_START);

function formatHour(h: number) {
  if (h === 0 || h === 24) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

export function DayTimeline({
  date,
  chips,
  events,
  rahuStart,
  rahuEnd,
  selectedEventId,
  onSelectEvent,
  tip,
  onDismissTip,
}: {
  date: Date;
  chips: TimedChip[];
  events: CalEvent[];
  rahuStart?: number;
  rahuEnd?: number;
  selectedEventId?: string | null;
  onSelectEvent?: (ev: CalEvent) => void;
  tip?: EventTip | null;
  onDismissTip?: () => void;
}) {
  const dayEvents = events.filter((e) => isSameLocalDay(e.start, date));
  const selected = dayEvents.find((e) => e.id === selectedEventId) || null;
  const railHeight = RAIL_HEIGHT;
  const laidOut = layoutEvents(dayEvents);
  const extras = Array.from(new Set(laidOut.map((item) => item.cluster)))
    .map((id) => laidOut.filter((item) => item.cluster === id && item.extra))
    .filter((group) => group.length > 0);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const showNow = isSameDay(date, now) && nowHour >= RAIL_START;

  return (
    <div className="space-y-3 satro-fade-in">
      <div className="satro-card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-orbit-muted/80 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="font-serif text-[17px] font-semibold">
            {format(date, "EEEE, MMM d")}
          </div>
          <div className="ml-auto text-[11px] text-space/70">6 AM – midnight</div>
        </div>

        <div className="relative flex" style={{ minHeight: railHeight }}>
          <div
            className="relative w-11 shrink-0 border-r border-orbit-muted/80 bg-orbit/60 sm:w-12"
            style={{ height: railHeight }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-0 flex w-full items-start justify-end pr-1.5 sm:pr-2"
                style={{ top: hourTop(h), height: ROW }}
              >
                <span className="-mt-2 text-[10px] font-medium tabular-nums text-space/70 sm:text-[11px]">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex-1" style={{ height: railHeight }}>
            {HOURS.map((h) => (
              <div
                key={`line-${h}`}
                className="absolute left-0 right-0 border-t border-orbit-muted/50"
                style={{ top: hourTop(h) }}
              />
            ))}
            {HOURS.map((h) => (
              <div
                key={`half-${h}`}
                className="absolute left-0 w-2 border-t border-orbit-muted/30 sm:w-3"
                style={{ top: hourTop(h) + ROW / 2 }}
              />
            ))}

            {rahuStart != null && rahuEnd != null && rahuEnd > rahuStart && (
              <div
                className="pointer-events-none absolute left-0 right-0 bg-gradient-to-b from-solar/[0.07] to-solar/[0.04]"
                style={{
                  top: hourTop(Math.max(6, rahuStart)),
                  height: Math.max(
                    8,
                    (Math.min(24, rahuEnd) - Math.max(6, rahuStart)) * ROW
                  ),
                }}
                title="Breather time"
              >
                <div className="absolute left-0 top-0 h-full w-0.5 bg-solar/25" />
                <span className="absolute right-2 top-1 rounded px-1 text-[9px] font-medium uppercase tracking-wide text-solar/70">
                  Breather
                </span>
              </div>
            )}

            {showNow && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-bloom"
                style={{ top: hourTop(nowHour) }}
                aria-hidden="true"
              >
                <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-bloom" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-y-0 left-1 right-[45%] sm:left-2 sm:right-[43%]">
              {layoutChips(chips).map(({ chip, top }) => (
                <div key={chip.id} className="absolute left-0 right-0 flex" style={{ top }}>
                  <KeywordChip label={chip.label} tone={chip.tone} compact />
                </div>
              ))}
            </div>

            <div className="absolute inset-y-0 left-[56%] right-1 sm:left-[58%] sm:right-2">
              {laidOut.filter((item) => !item.extra).map(({ event: ev, box, lane, lanes }) => {
                const active = selectedEventId === ev.id;
                const inRahu =
                  rahuStart != null &&
                  rahuEnd != null &&
                  box.startHour >= rahuStart &&
                  box.startHour < rahuEnd;
                const flagged =
                  inRahu ||
                  (tip && active && tip.pattern === "keep-in-mind");
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent?.(ev)}
                    aria-label={`${ev.summary}, ${formatEventTime(ev.start)}`}
                    className={`absolute overflow-hidden rounded-[10px] border-l-[3px] px-2 py-1 text-left text-[11px] leading-tight transition active:scale-[0.98] sm:text-xs ${
                      ev.satro
                        ? "bg-cosmic/[0.14] text-cosmic-deep"
                        : "bg-orbit-muted/70 text-space"
                    } ${
                      active ? "ring-2 ring-cosmic/70 ring-offset-1 ring-offset-orbit-card" : ""
                    } ${
                      flagged
                        ? "border-l-solar"
                        : ev.satro
                          ? "border-l-cosmic"
                          : "border-l-space/30"
                    }`}
                    style={{
                      top: box.top + 2,
                      height: box.height,
                      left: `${(lane / lanes) * 100}%`,
                      width: `calc(${100 / lanes}% - 2px)`,
                    }}
                  >
                    {box.compact ? (
                      <div className="truncate">
                        <span className="font-medium">{ev.summary}</span>
                        <span className="opacity-80"> · {formatEventTime(ev.start)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="truncate font-medium">{ev.summary}</div>
                        <div className="truncate opacity-80">
                          {formatEventTime(ev.start)}
                          {ev.type ? ` · ${ev.type}` : ""}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}

              {extras.map((group) => {
                const current = group.findIndex((item) => item.event.id === selectedEventId);
                const next = group[(current + 1) % group.length];
                return (
                  <button
                    key={next.cluster}
                    type="button"
                    aria-label={`${group.length} more at this time. Show ${next.event.summary}`}
                    onClick={() => onSelectEvent?.(next.event)}
                    className="absolute right-0 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-cosmic px-1.5 text-[11px] font-bold text-on-cosmic transition active:scale-95"
                    style={{ top: group[0].box.top - 6 }}
                  >
                    +{group.length}
                  </button>
                );
              })}

              {dayEvents.length === 0 && (
                <div className="absolute inset-x-1 top-6 flex flex-col items-start gap-1 rounded-xl border border-dashed border-orbit-muted bg-orbit/40 px-3 py-3 sm:inset-x-2">
                  <LeafSprig className="h-9 w-9 text-cosmic" />
                  <span className="font-serif text-sm font-semibold text-space/70">
                    Open day
                  </span>
                  <span className="text-[11px] leading-snug text-space/70">
                    No events yet — add one below, or sync Google on Home.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {tip && selected && (
        <EventTipSheet
          tip={tip}
          eventTitle={selected.summary}
          eventStart={selected.start}
          onClose={onDismissTip}
        />
      )}
      {tip && !selected && (
        <EventTipSheet tip={tip} onClose={onDismissTip} />
      )}
    </div>
  );
}

