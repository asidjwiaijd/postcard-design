import { NextRequest, NextResponse } from "next/server";
import { SITE } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { countGallery, countGalleryAuthors, listGallery, publicGalleryItem } from "@/lib/repo";
import { campaignStatus } from "@/lib/campaign";

export const dynamic = "force-dynamic";

/**
 * 首页作品墙的数据源。前端每隔十几秒带上 after 轮询一次，
 * 只把新交的那几张拿回去插到最前面。
 */
export async function GET(req: NextRequest) {
  ensureConfig();
  if (!SITE.showGallery) {
    return NextResponse.json({ enabled: false, total: 0, authors: 0, items: [] });
  }
  const approvedOnly = SITE.galleryApprovedOnly;
  const after = Number(req.nextUrl.searchParams.get("after") ?? 0) || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 48);

  return NextResponse.json({
    enabled: true,
    campaign: campaignStatus(),
    total: countGallery(approvedOnly),
    authors: countGalleryAuthors(approvedOnly),
    items: listGallery({ approvedOnly, after, limit }).map(publicGalleryItem),
  });
}
