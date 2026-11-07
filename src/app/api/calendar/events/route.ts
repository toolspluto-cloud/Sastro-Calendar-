import { NextRequest, NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/google";
import { readProfile } from "@/lib/store";

export async function GET(req: NextRequest) {
  const fromStr = req.nextUrl.searchParams.get("from");
  const toStr = req.nextUrl.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : new Date();
  const to = toStr
    ? new Date(toStr)
    : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  try {
    const result = await listEvents(from, to);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        events: [],
        mode: "mock",
        reason: e instanceof Error ? e.message : "Failed to list events",
      },
      { status: 200 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Expected JSON body with summary, start, end" },
        { status: 400 }
      );
    }
    const summary = body.summary;
    const start = body.start;
    const end = body.end;
    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: "Need summary, start, end (ISO)" },
        { status: 400 }
      );
    }
    if (new Date(String(end)) <= new Date(String(start))) {
      return NextResponse.json(
        { error: "End time needs to be after the start." },
        { status: 400 }
      );
    }
    const result = await createEvent({
      summary: String(summary),
      description: body.description ? String(body.description) : undefined,
      start: String(start),
      end: String(end),
      withMeet: Boolean(body.withMeet),
      type: body.type ? String(body.type) : undefined,
      timeZone: body.timeZone ? String(body.timeZone) : readProfile().currentTimeZone,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      {
        mode: "simulated",
        event: null,
        message:
          e instanceof Error
            ? `Create failed: ${e.message}`
            : "Create failed",
        error:
          e instanceof Error ? e.message : "Failed to create calendar event",
      },
      { status: 200 }
    );
  }
}
