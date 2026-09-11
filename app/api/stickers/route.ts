import { NextResponse } from "next/server";
import { listStickers } from "@/lib/repo";

/** 管理员上传的贴纸素材，所有登录用户可见 */
export async function GET() {
  return NextResponse.json({
    stickers: listStickers().map((s) => ({
      id: s.id, src: `/api/media/${s.storage_key}`,
      width: s.width, height: s.height, name: s.name, category: s.category || "社团素材",
    })),
  });
}
