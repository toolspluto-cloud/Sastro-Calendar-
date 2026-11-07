"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function HomeFunnel() {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setComplete(Boolean(d.complete)))
      .catch(() => setComplete(false));
  }, []);

  return (
    <Link href={complete ? "/calendar" : "/onboarding"} className="satro-btn-zest">
      {complete ? "Open your day" : "Start with profile"}
    </Link>
  );
}
