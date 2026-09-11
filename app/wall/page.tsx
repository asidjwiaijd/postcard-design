import Link from "next/link";
import { SITE } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { countGallery, countGalleryAuthors, listGallery, publicGalleryItem } from "@/lib/repo";
import { campaignStatus } from "@/lib/campaign";
import { WallScreen } from "@/components/gallery/WallScreen";

export const dynamic = "force-dynamic";

export const metadata = { title: "作品墙" };

/** 分享 / 大屏页：整屏流动的作品瀑布 + 实时提交数 */
export default async function WallPage() {
  ensureConfig();

  if (!SITE.showGallery) {
    return (
      <main className="bg-dreamy grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="text-ink-600 text-sm">社团暂时把作品墙关掉了</p>
          <Link href="/" className="text-ink-400 mt-3 inline-block text-xs underline">
            回首页
          </Link>
        </div>
      </main>
    );
  }

  const approvedOnly = SITE.galleryApprovedOnly;
  return (
    <WallScreen
      siteName={SITE.name}
      clubName={SITE.clubName}
      items={listGallery({ approvedOnly, limit: 60 }).map(publicGalleryItem)}
      total={countGallery(approvedOnly)}
      authors={countGalleryAuthors(approvedOnly)}
      cap={campaignStatus().cap}
    />
  );
}
