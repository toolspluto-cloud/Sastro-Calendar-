import type { KeywordTone } from "@/lib/timeline";

const TONE_CLASS: Record<KeywordTone, string> = {
  mood: "satro-chip satro-chip-mood",
  energy: "satro-chip satro-chip-energy",
  opportunity: "satro-chip satro-chip-opportunity",
  caution: "satro-chip satro-chip-caution",
};

export function KeywordChip({
  label,
  tone,
  domain,
  compact,
}: {
  label: string;
  tone: KeywordTone;
  domain?: string;
  compact?: boolean;
}) {
  return (
    <span
      title={domain ? `${label} · ${domain}` : label}
      className={`${TONE_CLASS[tone] || "satro-chip"} ${
        compact ? "!px-2 !py-0 shrink-0 whitespace-nowrap !overflow-visible text-[10px] leading-[18px]" : ""
      }`}
    >
      {label}
      {domain && !compact ? (
        <span className="ml-1">· {domain}</span>
      ) : null}
    </span>
  );
}
