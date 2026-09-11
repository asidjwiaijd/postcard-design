import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getAsset, deleteAsset } from "@/lib/repo";
import { storage } from "@/lib/storage";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const a = getAsset(id);
  if (!a || a.owner_id !== c.user.id) {
    return NextResponse.json({ error: "找不到这张素材" }, { status: 404 });
  }
  await storage.del(a.storage_key).catch(() => {});
  deleteAsset(id);
  return NextResponse.json({ ok: true });
}
