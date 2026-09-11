import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listSubmissions, submissionStats } from "@/lib/repo";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 200));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));

  const rows = listSubmissions(status, limit, offset).map((s) => ({
    id: s.id, title: s.title, note: s.note, status: s.status, reviewNote: s.review_note,
    printed: !!s.printed, qq: s.qq, nickname: s.nickname,
    thumb: `/api/media/${s.thumb_key}`,
    front: `/api/media/${s.front_key}`,
    back: `/api/media/${s.back_key}`,
    frontBytes: s.front_bytes, backBytes: s.back_bytes,
    createdAt: s.created_at, reviewedAt: s.reviewed_at,
  }));

  const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of submissionStats()) stats[r.status] = r.n;
  return NextResponse.json({ submissions: rows, stats });
}
