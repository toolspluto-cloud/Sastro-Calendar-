import { NextRequest, NextResponse } from "next/server";
import { readAdjustments, readProfile } from "@/lib/store";
import { buildDayTimeline, tipForEvent, type EventType } from "@/lib/timeline";

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T12:00:00") : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const profile = readProfile();
  const timeline = buildDayTimeline(date, profile.preferredDomains, profile.birthDate, readAdjustments());

  const eventHour = req.nextUrl.searchParams.get("eventHour");
  const eventEndHour = req.nextUrl.searchParams.get("eventEndHour");
  const eventType = req.nextUrl.searchParams.get("eventType") as EventType | null;
  let tip = null;
  if (eventHour != null) {
    const h = Number(eventHour);
    if (!Number.isNaN(h)) {
      tip = tipForEvent(timeline, {
        startHour: h,
        endHour: eventEndHour != null && eventEndHour !== "" ? Number(eventEndHour) : undefined,
        type: eventType || "other",
      });
    }
  }

  return NextResponse.json({ timeline, tip });
}
