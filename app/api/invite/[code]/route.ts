import { NextResponse } from "next/server";
import { checkInvite } from "@/lib/repo";
import { LIMITS } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  ensureConfig();
  const { code } = await params;
  const chk = checkInvite(code);
  if (!chk.ok) return NextResponse.json({ ok: false, reason: chk.reason }, { status: 404 });
  return NextResponse.json({
    ok: true,
    label: chk.invite.label,
    quota: chk.invite.quota_per_user ?? LIMITS.submissionsPerUser,
  });
}
