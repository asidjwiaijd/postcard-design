import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createAsset, listUserAssets, countUserAssets } from "@/lib/repo";
import { processUpload } from "@/lib/image";
import { storage, shardKey } from "@/lib/storage";
import { LIMITS } from "@/lib/config";
import { rateLimit } from "@/lib/ratelimit";
import { ensureConfig } from "@/lib/settings";

const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"]);

export async function GET() {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({
    assets: listUserAssets(c.user.id).map(toPublic),
    limit: LIMITS.uploadsPerUser,
  });
}

export async function POST(req: NextRequest) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const rl = rateLimit(`upload:${c.user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "上传太频繁了，缓一缓" }, { status: 429 });

  if (countUserAssets(c.user.id) >= LIMITS.uploadsPerUser) {
    return NextResponse.json(
      { error: `最多只能上传 ${LIMITS.uploadsPerUser} 张素材，删掉一些再传吧` },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
  }
  if (file.size > LIMITS.uploadMaxBytes) {
    return NextResponse.json(
      { error: `单张图不能超过 ${Math.round(LIMITS.uploadMaxBytes / 1048576)}MB` },
      { status: 413 },
    );
  }
  if (file.type && !OK_TYPES.has(file.type)) {
    return NextResponse.json({ error: "只支持 JPG / PNG / WebP / GIF" }, { status: 415 });
  }

  let processed;
  try {
    processed = await processUpload(Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "这张图读不出来，换一张试试" }, { status: 400 });
  }

  const asset = createAsset({
    owner_id: c.user.id, kind: "upload", category: "", name: file.name.slice(0, 80),
    storage_key: "", mime: processed.mime,
    width: processed.width, height: processed.height, bytes: processed.buffer.byteLength, sort: 0,
  });
  const key = shardKey("uploads", asset.id, processed.ext);
  await storage.put(key, processed.buffer);
  const { run } = await import("@/lib/db");
  run(`UPDATE assets SET storage_key = ? WHERE id = ?`, key, asset.id);

  return NextResponse.json({ asset: toPublic({ ...asset, storage_key: key }) });
}

function toPublic(a: { id: string; storage_key: string; width: number; height: number; name: string; bytes: number }) {
  return {
    id: a.id, src: `/api/media/${a.storage_key}`,
    width: a.width, height: a.height, name: a.name, bytes: a.bytes,
  };
}
