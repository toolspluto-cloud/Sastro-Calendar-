"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function HomeAuth({ googleConfigured }: { googleConfigured: boolean }) {
  const { data: session, status } = useSession();

  if (status === "authenticated" && session?.error === "RefreshAccessTokenError") {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="satro-btn-solar"
      >
        Google session expired — reconnect
      </button>
    );
  }

  if (status === "authenticated") {
    return (
      <button
        type="button"
        onClick={() => signOut()}
        className="satro-btn bg-white/15 text-white hover:bg-white/25"
      >
        Sign out {session?.user?.email ? `(${session.user.email})` : ""}
      </button>
    );
  }

  if (googleConfigured) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="satro-btn bg-white/15 text-white hover:bg-white/25"
      >
        Connect Google Calendar
      </button>
    );
  }

  return (
    <span className="satro-btn cursor-default bg-white/10 text-white/80">
      Sample events for now
    </span>
  );
}
