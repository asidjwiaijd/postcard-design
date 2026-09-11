import { NextResponse } from "next/server";
import { currentUser, publicUser } from "@/lib/auth";

export async function GET() {
  const c = await currentUser();
  if (!c) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user: publicUser(c) });
}
