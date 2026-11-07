"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

// Route handlers can't write the session cookie, so a refreshed Google token
// only persists through this client fetch. Poll to keep it current in open tabs.
const SESSION_REFETCH_SECONDS = 30 * 60;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={SESSION_REFETCH_SECONDS}>
      {children}
    </SessionProvider>
  );
}
