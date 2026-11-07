import { NextRequest, NextResponse } from "next/server";
import { askSatro } from "@/lib/assistant";
import { answerFromCorpus, dailyTip, howTodayLooks } from "@/lib/chat";
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

export async function GET() {
  return NextResponse.json({
    tip: dailyTip(),
    today: howTodayLooks(),
    moments: momentChips(),
    name: readProfile().displayName.split(" ")[0],
    insight: learningInsight(readFeedback()),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = String(body.question || body.message || "");
  const sender = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (overLimit(sender)) {
    return NextResponse.json({ ...answerFromCorpus(question), mode: "rules" });
  }
  return NextResponse.json(
    await askSatro(question, body.history, typeof body.about === "string" ? body.about : "")
  );
}
