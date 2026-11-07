import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    googleConfigured: isGoogleConfigured(),
    mockForced: process.env.SATRO_MOCK_CALENDAR === "true",
  });
}
