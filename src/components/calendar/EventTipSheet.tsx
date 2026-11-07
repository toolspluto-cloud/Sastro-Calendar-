"use client";

import { useEffect, useRef, useState } from "react";

import { KeywordChip } from "@/components/KeywordChip";
import { formatEventTime } from "@/lib/datetime";
import type { EventTip, TipPattern } from "@/lib/timeline";

export type { TipPattern };

const SWIPE_CLOSE_PX = 80;

export function tipPattern(tip: EventTip): TipPattern {
  if (tip.pattern) return tip.pattern;
  if (tip.leanIn) return "lean-in";
  if (tip.keepInMind.length > 0) return "keep-in-mind";
  return "neutral";
}

const PATTERN_META: Record<
  TipPattern,
  { badge: string; defaultHeadline: string; shell: string; badgeClass: string }
> = {
  "lean-in": {
    badge: "Great time",
    defaultHeadline: "Great vibe, go for it",
    shell: "bg-cosmic/[0.06]",
    badgeClass: "bg-cosmic/15 text-cosmic",
  },
  "keep-in-mind": {
    badge: "Go gentle",
    defaultHeadline: "Give this one extra care",
    shell: "bg-solar/[0.06]",
    badgeClass: "bg-solar/15 text-solar",
  },
  neutral: {
    badge: "Good to go",
    defaultHeadline: "You're good to go",
    shell: "",
    badgeClass: "bg-orbit-muted text-space/70",
  },
};

export function EventTipSheet({
  tip,
  eventTitle,
  eventStart,
  onClose,
}: {
  tip: EventTip;
  eventTitle?: string;
  eventStart?: string;
  onClose?: () => void;
}) {
  const pattern = tipPattern(tip);
  const meta = PATTERN_META[pattern];
  const actions =
    pattern === "lean-in"
      ? tip.leanInTips.slice(0, 2)
      : tip.keepInMind.slice(0, 2);
  const evidence = tip.overlappingChips?.slice(0, 4) || [];

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  // Keep the keyboard inside the sheet, and hand focus back when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>("button")?.focus();
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = scroll;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="satro-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Event tip"
      ref={sheetRef}
      style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      className="satro-sheet-up relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-orbit-card pb-[env(safe-area-inset-bottom)] shadow-satro md:satro-fade-in md:rounded-[28px] md:pb-0"
    >
    <div className={`max-h-[70vh] overflow-y-auto px-5 pb-7 pt-2 md:pb-5 md:pt-5 ${meta.shell}`}>
      {/* Swipe the grabber down to dismiss, like an iOS sheet. */}
      <div
        aria-hidden="true"
        className="-mt-2 flex touch-none justify-center pb-3 pt-2 md:hidden"
        onPointerDown={(e) => {
          dragStart.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragStart.current != null) setDragY(Math.max(0, e.clientY - dragStart.current));
        }}
        onPointerUp={() => {
          dragStart.current = null;
          if (dragY > SWIPE_CLOSE_PX) onClose?.();
          else setDragY(0);
        }}
      >
        <span className="h-[5px] w-9 rounded-full bg-space/20" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}
            >
              {meta.badge}
            </span>
            {eventTitle ? (
              <span className="truncate text-xs text-space/70">
                {eventTitle}
                {eventStart ? ` · ${formatEventTime(eventStart)}` : ""}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-serif text-[22px] font-semibold leading-tight text-space">
            {tip.headline || meta.defaultHeadline}
          </h3>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-space/[0.08] text-space/70 transition active:scale-90"
            aria-label="Dismiss tip"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {actions.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-space/80">
          {actions.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-space/35" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}

      {evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-space/5 pt-2.5">
          <span className="w-full text-[10px] font-medium uppercase tracking-wide text-space/70">
            Today&apos;s vibes
          </span>
          {evidence.map((c) => (
            <KeywordChip
              key={c.id}
              label={c.label}
              tone={c.tone}
              domain={c.domain}
              compact
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-space/70">
        Traditional / symbolic guidance for entertainment.
      </p>
    </div>
    </div>
    </div>
  );
}
