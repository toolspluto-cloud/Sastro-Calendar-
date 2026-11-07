"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Primary tabs — Day is home. */
const PRIMARY: Array<{ href: string; label: string; icon: ReactNode }> = [
  {
    href: "/calendar",
    label: "Day",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 4c4.7 0 8.5 3.1 8.5 7s-3.8 7-8.5 7c-1 0-2-.1-2.9-.4L4.5 20l1.2-3.7C4.3 15 3.5 13.1 3.5 11c0-3.9 3.8-7 8.5-7Z" />
      </svg>
    ),
  },
  {
    href: "/prep",
    label: "Prep",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5ZM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
      </svg>
    ),
  },
];

function linkActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="satro-glass sticky top-0 z-40 border-b border-space/[0.06]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:py-3">
        <Link
          href="/calendar"
          className="flex shrink-0 items-center gap-2 text-[15px] font-bold tracking-tight text-space"
        >
          <span className="satro-hero flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-bold text-white">
            S
          </span>
          Satro
        </Link>

        {/* Desktop top nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {PRIMARY.map((l) => {
            const active = linkActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-cosmic text-on-cosmic"
                    : "text-space/70 hover:bg-cosmic/10 hover:text-cosmic"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile: tabs live in BottomNav */}
        <Link
          href="/"
          className="flex min-h-10 items-center rounded-full px-3 text-[13px] font-semibold text-cosmic md:hidden"
        >
          Home
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}
      aria-label="Primary"
    >
      <div
        className="satro-glass pointer-events-auto mx-auto flex max-w-md items-stretch rounded-full p-1 shadow-[0_8px_32px_rgb(18_16_26/0.2)]"
        style={{ border: "0.5px solid var(--glass-edge)" }}
      >
        {PRIMARY.map((l) => {
          const active = linkActive(pathname, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold transition duration-200 active:scale-95 ${
                active ? "bg-cosmic/[0.14] text-cosmic-deep" : "text-space/70"
              }`}
            >
              {l.icon}
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DisclaimerBanner() {
  return (
    <p className="mx-auto max-w-5xl px-4 pt-2.5 text-[11px] leading-relaxed text-space/70 sm:pt-3 sm:text-xs">
      Traditional / symbolic guidance for entertainment — not predictive certainty. A Tuto project by Pluto Theory.
    </p>
  );
}
