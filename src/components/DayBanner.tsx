"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { WatercolorScene, type ScenePalette } from "@/components/Art";
import { nextBestTime, vibeAt } from "@/lib/vibes";

function moment(hour: number): { palette: ScenePalette; greeting: string; ink: string } {
  if (hour >= 5 && hour < 11) {
    return { palette: "dawn", greeting: "Good morning", ink: "#2E2A44" };
  }
  if (hour >= 11 && hour < 17) {
    return { palette: "day", greeting: "Good afternoon", ink: "#1C2B29" };
  }
  if (hour >= 17 && hour < 21) {
    return { palette: "dusk", greeting: "Good evening", ink: "#2E2A44" };
  }
  return { palette: "night", greeting: "Good night", ink: "#FFFFFF" };
}

type Rail = Parameters<typeof vibeAt>[0];

/** Watercolour greeting with a live read of right now, on the viewer's clock. */
export function DayBanner({
  name,
  rail,
  children,
}: {
  name: string;
  rail: Rail | null;
  children?: ReactNode;
}) {
  // Set after mount: the server doesn't know the viewer's clock.
  const [hour, setHour] = useState(12);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const now = new Date();
    setHour(now.getHours() + now.getMinutes() / 60);
    setMounted(true);
  }, []);
  const { palette, greeting, ink } = moment(hour);
  const vibe = mounted && rail ? vibeAt(rail, hour) : null;
  const next = mounted && rail ? nextBestTime(rail, hour) : null;

  return (
    <section className="relative min-h-36 overflow-hidden rounded-[24px] shadow-satro">
      <WatercolorScene palette={palette} className="absolute inset-0 h-full w-full" />
      <div className="relative p-4" style={{ color: ink }}>
        <h1 className="pr-20 font-serif text-[26px] font-semibold leading-tight">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <div className="mt-1.5">{children}</div>
      </div>
      {vibe && (
        <div className="satro-glass relative mx-3 mb-3 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-space">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[17px] font-semibold leading-tight">
              Right now: {vibe.word}
            </p>
            <p className="text-[13px] leading-snug text-space/70">
              {next ? `Next best time: ${next.time}, ${next.label}` : vibe.line}
            </p>
          </div>
          <Link href="/chat" className="satro-btn-ghost satro-btn-sm shrink-0">
            Check in
          </Link>
        </div>
      )}
    </section>
  );
}
