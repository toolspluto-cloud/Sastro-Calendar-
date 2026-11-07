"use client";

import { useState } from "react";
import type { MomentChip } from "@/lib/moments";

/** Tap a life moment to ask about it. Groups keep the 20+ options easy to scan. */
export function MomentPicker({
  moments,
  onPick,
}: {
  moments: MomentChip[];
  onPick: (question: string) => void;
}) {
  const groups = Array.from(new Set(moments.map((m) => m.group)));
  const [group, setGroup] = useState("");
  const active = group || groups[0];
  if (moments.length === 0) return null;

  return (
    <section className="satro-card-tight space-y-3">
      <h2 className="satro-section-title">What&apos;s on your mind?</h2>
      <div className="satro-segment overflow-x-auto [scrollbar-width:none]">
        {groups.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={g === active}
            onClick={() => setGroup(g)}
            className="satro-segment-item shrink-0 !px-2.5"
          >
            {g}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {moments
          .filter((m) => m.group === active)
          .map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.question)}
              className="min-h-10 rounded-full bg-cosmic/[0.1] px-3.5 text-[13px] font-semibold text-cosmic-deep transition active:scale-95"
            >
              <span aria-hidden="true">{m.emoji}</span> {m.label}
            </button>
          ))}
      </div>
    </section>
  );
}
