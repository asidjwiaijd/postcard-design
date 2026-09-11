import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { reviewSubmission, setPrinted, getSubmission, deleteSubmission } from "@/lib/repo";
import { storage } from "@/lib/storage";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  if (!getSubmission(id)) return NextResponse.json({ error: "不存在" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    status?: string; reviewNote?: string; printed?: boolean;
  };

  if (body.status) {
    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "状态不合法" }, { status: 400 });
    }
    reviewSubmission(id, body.status, (body.reviewNote ?? "").slice(0, 300));
  }
  if (body.printed !== undefined) setPrinted(id, body.printed);

  return NextResponse.json({ ok: true, submission: getSubmission(id) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const s = getSubmission(id);
  if (!s) return NextResponse.json({ error: "不存在" }, { status: 404 });
  await Promise.all(
    [s.front_key, s.back_key, s.thumb_key].filter(Boolean).map((k) => storage.del(k).catch(() => {})),
  );
  deleteSubmission(id);
  return NextResponse.json({ ok: true });
}
