"use client";

import { ALL_DOMAINS, toggleDomain, type Domain } from "@/lib/profile";

const FIRST_CLASS = 5;

export function DomainMultiSelect({
  value,
  onChange,
}: {
  value: Domain[];
  onChange: (next: Domain[]) => void;
}) {
  return (
    <div>
      <div role="group" aria-label="Life domains" className="flex flex-wrap gap-2">
        {ALL_DOMAINS.map((d) => {
          const rank = value.indexOf(d) + 1;
          const on = rank > 0;
          const firstClass = on && rank <= FIRST_CLASS;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(toggleDomain(value, d))}
              className={`satro-domain-pill min-h-10 !text-[13px] transition active:scale-95 ${
                firstClass
                  ? "!bg-cosmic !text-on-cosmic"
                  : on
                    ? "!bg-cosmic/15 !text-cosmic"
                    : ""
              }`}
            >
              {on && (
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${
                    firstClass ? "bg-white/25" : "bg-cosmic/15"
                  }`}
                >
                  <span className="sr-only">Priority </span>
                  {rank}
                </span>
              )}
              {d}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-space/70">
        Tap in order of priority. Your first {FIRST_CLASS} show up front, and at
        least one stays on.
      </p>
    </div>
  );
}
