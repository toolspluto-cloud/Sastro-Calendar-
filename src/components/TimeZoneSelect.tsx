"use client";

import { useMemo } from "react";

function timeZones(current: string): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const zones = intl.supportedValuesOf?.("timeZone") ?? [];
  return zones.includes(current) ? zones : [current, ...zones];
}

export function TimeZoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (zone: string) => void;
}) {
  const zones = useMemo(() => timeZones(value), [value]);
  return (
    <label className="satro-label">
      Current timezone
      <select
        className="satro-input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
