import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createAsset, listStickers } from "@/lib/repo";
import { processUpload } from "@/lib/image";
import { storage, shardKey } from "@/lib/storage";
import { run } from "@/lib/db";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json({
    stickers: listStickers().map((s) => ({
      id: s.id, src: `/api/media/${s.storage_key}`, name: s.name,
      category: s.category, width: s.width, height: s.height, bytes: s.bytes,
    })),
  });
}

/** 社团自己的贴纸（Logo、吉祥物立绘等）从这里入库，全站可用 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const category = String(form.get("category") ?? "社团素材").slice(0, 30);
  if (!(file instanceof File)) return NextResponse.json({ error: "没有文件" }, { status: 400 });

  let p;
  try {
    p = await processUpload(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "图片无法处理" }, { status: 400 });
  }

  const asset = createAsset({
    owner_id: null, kind: "sticker", category,
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
    storage_key: "", mime: p.mime, width: p.width, height: p.height,
    bytes: p.buffer.byteLength, sort: 0,
  });
  const key = shardKey("stickers", asset.id, p.ext);
  await storage.put(key, p.buffer);
  run(`UPDATE assets SET storage_key = ? WHERE id = ?`, key, asset.id);

  return NextResponse.json({ sticker: { ...asset, src: `/api/media/${key}` } });
}
