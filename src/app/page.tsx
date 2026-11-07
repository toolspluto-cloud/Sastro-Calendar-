import Link from "next/link";
import { isGoogleConfigured } from "@/lib/auth";
import { MeditatorLine, WatercolorScene, type ScenePalette } from "@/components/Art";
import { HomeAuth } from "@/components/HomeAuth";
import { HomeFunnel } from "@/components/HomeFunnel";

// Read Google env at request time, not at build time.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const googleConfigured = isGoogleConfigured();

  return (
    <div className="space-y-8 satro-fade-in sm:space-y-10">
      <section className="relative overflow-hidden rounded-[28px] satro-hero px-5 py-10 text-white shadow-satro sm:px-8 sm:py-14">
        <WatercolorScene palette="hero" className="absolute inset-0 h-full w-full" />
        <MeditatorLine className="relative mx-auto mb-4 h-28 w-28 text-white sm:absolute sm:bottom-8 sm:right-10 sm:mb-0 sm:h-48 sm:w-48" />
        <div className="relative max-w-xl space-y-4">
          <p className="text-xs uppercase tracking-widest text-white/80">
            Pluto Theory · Tuto · Build
          </p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.1] md:text-5xl">
            Your day, with better vibes.
          </h1>
          <p className="text-white/90">
            Find your best time for dates, exams, interviews, meetings and nights out. Plan your day with good vibes.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <HomeFunnel />
            <HomeAuth googleConfigured={googleConfigured} />
          </div>
          <p className="text-xs text-white/80">
            {googleConfigured
              ? "Connect Google to see your real calendar."
              : "You'll see sample events with a Mock badge for now."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {([
          {
            href: "/profile",
            palette: "dawn",
            title: "1 · Profile",
            body: "Tell Satro about you and what matters most.",
          },
          {
            href: "/calendar",
            palette: "day",
            title: "2 · Day timeline",
            body: "See your great-vibe hours and how each plan is looking.",
          },
          {
            href: "/chat",
            palette: "dusk",
            title: "3 · Guide chat",
            body: "Ask about crushes, exams, work or anything on your mind.",
          },
        ] as Array<{ href: string; palette: ScenePalette; title: string; body: string }>).map((c) => (
          <Link key={c.href} href={c.href} className="satro-card flex items-center gap-4 p-4 transition active:scale-[0.98]">
            <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[20px]">
              <WatercolorScene palette={c.palette} className="absolute inset-0 h-full w-full" />
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-[17px] font-semibold text-space">{c.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-space/70">{c.body}</span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
