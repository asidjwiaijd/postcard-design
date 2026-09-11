import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { run } from "@/lib/db";
import { getInviteById } from "@/lib/repo";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  if (!getInviteById(id)) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as {
    active?: boolean; label?: string; maxUses?: number; quotaPerUser?: number | null;
  };
  if (b.active !== undefined) run(`UPDATE invites SET active = ? WHERE id = ?`, b.active ? 1 : 0, id);
  if (b.label !== undefined) run(`UPDATE invites SET label = ? WHERE id = ?`, b.label.slice(0, 60), id);
  if (b.maxUses !== undefined) run(`UPDATE invites SET max_uses = ? WHERE id = ?`, Math.max(0, b.maxUses), id);
  if (b.quotaPerUser !== undefined)
    run(`UPDATE invites SET quota_per_user = ? WHERE id = ?`, b.quotaPerUser, id);
  return NextResponse.json({ ok: true, invite: getInviteById(id) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  run(`UPDATE invites SET active = 0 WHERE id = ?`, id);
  return NextResponse.json({ ok: true });
}
