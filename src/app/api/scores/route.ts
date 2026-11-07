import { NextRequest, NextResponse } from "next/server";
import { scoreDay } from "@/lib/scoring";
import { readProfile } from "@/lib/store";

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T12:00:00") : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  return NextResponse.json(scoreDay(date, readProfile().birthDate));
}
