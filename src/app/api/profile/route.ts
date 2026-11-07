import { NextRequest, NextResponse } from "next/server";
import { isProfileComplete, normalizeProfile, profileError } from "@/lib/profile";
import { readProfile, writeProfile } from "@/lib/store";

export async function GET() {
  const profile = readProfile();
  return NextResponse.json({ profile, complete: isProfileComplete(profile) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const profile = normalizeProfile(body);
  const error = profileError(profile);
  if (error) return NextResponse.json({ error, profile }, { status: 400 });
  writeProfile(profile);
  return NextResponse.json({ profile, complete: true, saved: true });
}
