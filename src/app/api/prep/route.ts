import { NextRequest, NextResponse } from "next/server";
import { comparePeople } from "@/lib/prep";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const you = body.you as { name?: string; birthDate?: string } | undefined;
  const them = body.them as { name?: string; birthDate?: string } | undefined;
  if (!you?.name || !you?.birthDate || !them?.name || !them?.birthDate) {
    return NextResponse.json(
      { error: "Need you.name, you.birthDate, them.name, them.birthDate" },
      { status: 400 }
    );
  }
  try {
    const result = comparePeople(
      { name: you.name, birthDate: you.birthDate },
      { name: them.name, birthDate: them.birthDate }
    );
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Compare failed" },
      { status: 400 }
    );
  }
}
