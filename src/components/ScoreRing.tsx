import { VIBE_WORDS } from "@/lib/vibes";

export function ScoreRing({
  label,
  score,
  tone,
}: {
  label: string;
  score: number;
  tone: "avoid" | "neutral" | "favored";
}) {
  const color =
    tone === "favored"
      ? "rgb(var(--cosmic))"
      : tone === "avoid"
        ? "rgb(var(--solar))"
        : "rgb(var(--space) / 0.55)";
  const pct = Math.round((score / 10) * 100);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div
        role="img"
        aria-label={`${label}: ${score} out of 10`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16"
        style={{
          background: `conic-gradient(${color} ${pct}%, rgb(var(--orbit-muted)) ${pct}%)`,
        }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orbit-card text-sm font-semibold text-space sm:h-12 sm:w-12">
          {score}
        </div>
      </div>
      <div className="text-xs font-medium text-space">{label}</div>
      <div className="text-[11px] leading-tight text-space/70">{VIBE_WORDS[tone]}</div>
    </div>
  );
}
