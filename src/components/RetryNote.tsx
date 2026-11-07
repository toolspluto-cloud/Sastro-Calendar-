"use client";

/** One friendly sentence and a Retry button for when a screen can't load. */
export function RetryNote({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl bg-orbit-card px-3.5 py-2.5 text-sm text-space/75 shadow-satro"
    >
      <span>Satro can&apos;t connect right now.</span>
      <button type="button" className="satro-btn-ghost satro-btn-sm shrink-0" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
