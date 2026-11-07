/** Original illustrations. Pure SVG so they stay crisp, light and theme-safe. */

export type ScenePalette = "hero" | "dawn" | "day" | "dusk" | "night";

const PALETTES: Record<
  ScenePalette,
  { sky: [string, string]; sun: string; hills: [string, string, string] }
> = {
  hero: { sky: ["#1F7A6E", "#3FA392"], sun: "#FBD2B4", hills: ["#6FC4B0", "#2F9486", "#1F7A6E"] },
  dawn: { sky: ["#F9D7C4", "#D9CDF2"], sun: "#F39167", hills: ["#C9B6E4", "#A08FCE", "#6E8FA0"] },
  day: { sky: ["#CFEFE5", "#F4F2CC"], sun: "#F7CE7A", hills: ["#A8DCC9", "#6DBBA8", "#2F9486"] },
  dusk: { sky: ["#B7A6E0", "#F6B79A"], sun: "#FBE3B5", hills: ["#E08F7C", "#A9688C", "#5C4A7E"] },
  night: { sky: ["#2C3A68", "#6B5E9E"], sun: "#F4EBC8", hills: ["#4A5B8C", "#2F4A63", "#183A44"] },
};

/** Soft-edged hills and a sun; the filter wobbles edges and blotches pigment. */
export function WatercolorScene({
  palette,
  className,
}: {
  palette: ScenePalette;
  className?: string;
}) {
  const { sky, sun, hills } = PALETTES[palette];
  const skyId = `satro-sky-${palette}`;
  const paintId = "satro-watercolor";
  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMaxYMax slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <filter id={paintId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="7" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="22" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3" result="blot" />
          <feColorMatrix
            in="blot"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.45"
            result="mask"
          />
          <feComposite in="shape" in2="mask" operator="in" />
        </filter>
      </defs>
      <rect width="400" height="240" fill={`url(#${skyId})`} />
      <g filter={`url(#${paintId})`}>
        <circle cx="300" cy="86" r="34" fill={sun} opacity="0.9" />
        <path d="M-20 160C50 110 110 118 170 146s130 10 250-30v140H-20Z" fill={hills[0]} opacity="0.8" />
        <path d="M-20 196C70 150 140 186 220 176s120-30 200-14v94H-20Z" fill={hills[1]} opacity="0.85" />
        <path d="M-20 226c90-34 170-14 240-16s130-14 200 0v46H-20Z" fill={hills[2]} opacity="0.9" />
      </g>
    </svg>
  );
}

/** One-line seated figure with a small sparkle halo. Inherits currentColor. */
export function MeditatorLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="56" r="17" />
      <circle cx="100" cy="33" r="6" />
      <path d="M92 73c-1 4-3 6-10 8-10 3-15 9-18 20l-9 33c-1 5 1 8 6 9" />
      <path d="M108 73c1 4 3 6 10 8 10 3 15 9 18 20l9 33c1 5-1 8-6 9" />
      <path d="M78 104c1 12 2 22 0 32M122 104c-1 12-2 22 0 32" />
      <path d="M30 168c10-14 30-22 48-24 14-1 30 6 44 16 8 6 2 14-8 13-22-2-58 1-76 3-9 1-12-3-8-8Z" />
      <path d="M170 168c-10-14-30-22-48-24-14-1-30 6-44 16-8 6-2 14 8 13 22-2 58 1 76 3 9 1 12-3 8-8Z" />
      <path d="M100 8v6M97 11h6M152 40v8M148 44h8M46 44v6M43 47h6" strokeWidth="1.8" />
      <path d="M158 92c6-2 10-7 11-14-7 1-12 6-11 14ZM42 92c-6-2-10-7-11-14 7 1 12 6 11 14Z" strokeWidth="1.8" />
    </svg>
  );
}

export function LeafSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 43C14 28 24 16 39 7" />
      <path d="M18 27c-6-1-10-6-10-12 6 1 11 5 10 12ZM27 17c-1-6 2-10 8-12 1 6-2 10-8 12ZM14 35c5-4 12-5 18-1-5 4-12 5-18 1ZM23 24c5-3 11-3 16 1-5 3-11 3-16-1Z" />
    </svg>
  );
}
