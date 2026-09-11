import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { run } from "@/lib/db";
import { getUserById } from "@/lib/repo";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  if (!getUserById(id)) return NextResponse.json({ error: "不存在" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as { banned?: boolean; quotaOverride?: number | null };
  if (b.banned !== undefined) run(`UPDATE users SET banned = ? WHERE id = ?`, b.banned ? 1 : 0, id);
  if (b.quotaOverride !== undefined)
    run(`UPDATE users SET quota_override = ? WHERE id = ?`, b.quotaOverride, id);
  return NextResponse.json({ ok: true, user: getUserById(id) });
}
