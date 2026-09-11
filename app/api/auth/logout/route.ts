import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/session";

export async function POST() {
  await clearUserSession();
  return NextResponse.json({ ok: true });
}
