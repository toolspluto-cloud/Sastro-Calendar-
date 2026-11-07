import { NextRequest, NextResponse } from "next/server";
import { askSatro } from "@/lib/assistant";
import { answerFromCorpus, dailyTip, howTodayLooks } from "@/lib/chat";
import { isValidTimeZone, wallClockIn } from "@/lib/datetime";
import { learningInsight } from "@/lib/feedback";
import { momentChips } from "@/lib/moments";
import { readFeedback, readProfile } from "@/lib/store";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const recent = new Map<string, number[]>();

/** Each AI reply costs money, so a sender over the limit gets rule-based replies. */
function overLimit(sender: string, now = Date.now()) {
  const hits = (recent.get(sender) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(sender, hits);
  return hits.length > MAX_PER_WINDOW;
}

/**
 * The user's wall-clock now. Prefer the browser's zone, then the profile's;
 * the server clock (UTC on Vercel) is only the last resort.
 */
function userNow(sentZone: unknown) {
  const zone = isValidTimeZone(sentZone) ? sentZone : readProfile().currentTimeZone;
  return wallClockIn(zone);
}

export async function GET(req: NextRequest) {
  const now = userNow(req.nextUrl.searchParams.get("tz"));
  return NextResponse.json({
    tip: dailyTip(now),
    today: howTodayLooks(now),
    moments: momentChips(),
    name: readProfile().displayName.split(" ")[0],
    insight: learningInsight(readFeedback()),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || body.message || "");
  const now = userNow(body.timeZone);
  const sender = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (overLimit(sender)) {
    return NextResponse.json({ ...answerFromCorpus(question, now), mode: "rules" });
  }
  return NextResponse.json(
    await askSatro(
      question,
      body.history,
      typeof body.about === "string" ? body.about : "",
      now
    )
  );
}
