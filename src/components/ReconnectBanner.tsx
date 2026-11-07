"use client";

import { signIn } from "next-auth/react";

export function ReconnectBanner() {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-solar/25 bg-solar/[0.08] px-3 py-2 text-xs text-space/75"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-solar" />
        Google session expired — reconnect to see your real calendar.
      </span>
      <button
        type="button"
        onClick={() => signIn("google")}
        className="satro-btn-solar satro-btn-sm"
      >
        Reconnect
      </button>
    </div>
  );
}
