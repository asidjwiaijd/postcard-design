import { NextRequest } from "next/server";
import { storage } from "@/lib/storage";
import { SITE } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { getSubmissionByMediaKey } from "@/lib/repo";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", svg: "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  ensureConfig();
  const { key } = await params;
  const path = key.join("/");
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const type = TYPES[ext];
  if (!type) return new Response("Not found", { status: 404 });

  // 后台把「提交后立即可下载」关掉时，未通过的成品只有管理员看得到。
  // 默认开着，这时一次数据库都不查。
  if (!SITE.downloadBeforeReview) {
    const sub = getSubmissionByMediaKey(path);
    if (sub && sub.status !== "approved") {
      // 作品墙放的是缩略图，开着墙就得让它过，否则首页全是裂图
      const onWall = SITE.showGallery && !SITE.galleryApprovedOnly && path === sub.thumb_key;
      if (!onWall && !(await isAdmin())) return new Response("Forbidden", { status: 403 });
    }
  }

  try {
    const body = await storage.stream(path);
    return new Response(body, {
      headers: {
        "Content-Type": type,
        // key 里带内容 id，改内容必然换 key，可以放心长缓存
        "Cache-Control": SITE.downloadBeforeReview
          ? "public, max-age=31536000, immutable"
          : "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
