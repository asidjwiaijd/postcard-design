import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAsset, deleteAsset } from "@/lib/repo";
import { storage } from "@/lib/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const a = getAsset(id);
  if (!a || a.kind !== "sticker") return NextResponse.json({ error: "不存在" }, { status: 404 });
  await storage.del(a.storage_key).catch(() => {});
  deleteAsset(id);
  return NextResponse.json({ ok: true });
}
