"use client";

import { useState } from "react";
import { explainerById } from "@/lib/vibes";

/** A small "What's this?" link that opens a two-line explanation. */
export function Explain({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const explainer = explainerById(id);
  if (!explainer) return null;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="min-h-8 shrink-0 font-semibold text-cosmic"
      >
        {open ? "Got it" : "What's this?"}
      </button>
      {open && (
        <p className="basis-full pt-1 text-[13px] leading-snug text-space/70">{explainer.body}</p>
      )}
    </>
  );
}
