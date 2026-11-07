import { NextRequest, NextResponse } from "next/server";
import { daySummary, parseFeedback, upsertFeedback } from "@/lib/feedback";
import { readFeedback, readProfile, writeFeedback } from "@/lib/store";
import { buildDayTimeline, tipForEvent } from "@/lib/timeline";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const all = readFeedback();
  const entries = date ? all.filter((e) => e.date === date) : all.slice(-50);
  return NextResponse.json({ entries, summary: entries.length ? daySummary(entries) : "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseFeedback(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Remember which tip this event got, so the rating can teach the right area.
  const { entry } = parsed;
  if (entry.startHour != null) {
    const profile = readProfile();
    const tip = tipForEvent(
      buildDayTimeline(new Date(`${entry.date}T12:00:00`), profile.preferredDomains, profile.birthDate),
      {
        startHour: entry.startHour,
        endHour: Number(body.endHour) || undefined,
        type: entry.eventType,
      }
    );
    entry.pattern = tip.pattern;
    entry.domain = tip.domain;
  }

  writeFeedback(upsertFeedback(readFeedback(), entry));
  return NextResponse.json({ entry, saved: true });
}
