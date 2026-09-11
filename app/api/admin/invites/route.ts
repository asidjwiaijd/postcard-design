import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createInvite, listInvites } from "@/lib/repo";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({
    invites: listInvites().map((i) => ({
      id: i.id, code: i.code, label: i.label,
      maxUses: i.max_uses, usedCount: i.used_count,
      quotaPerUser: i.quota_per_user, expiresAt: i.expires_at,
      active: !!i.active, createdAt: i.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as {
    label?: string; maxUses?: number; quotaPerUser?: number | null; expiresInDays?: number | null;
  };
  const invite = createInvite({
    label: (b.label ?? "").slice(0, 60),
    maxUses: Math.max(0, Number(b.maxUses ?? 0)),
    quotaPerUser: b.quotaPerUser == null ? null : Math.max(1, Number(b.quotaPerUser)),
    expiresAt: b.expiresInDays ? Date.now() + Number(b.expiresInDays) * 86400_000 : null,
  });
  return NextResponse.json({ invite: { ...invite, active: !!invite.active } });
}
