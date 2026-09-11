import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listUsers, quotaFor } from "@/lib/repo";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({
    users: listUsers().map((u) => ({
      id: u.id, qq: u.qq, nickname: u.nickname, banned: !!u.banned,
      quota: quotaFor(u), quotaOverride: u.quota_override, submissions: u.subs,
      avatar: `/api/media/${u.avatar_key ?? ""}`,
      createdAt: u.created_at, lastSeenAt: u.last_seen_at,
    })),
  });
}
