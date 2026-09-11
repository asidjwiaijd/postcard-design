import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { SITE, SPEC } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { countGallery, countGalleryAuthors, listGallery, publicGalleryItem } from "@/lib/repo";
import { campaignStatus } from "@/lib/campaign";
import { GalleryWall } from "@/components/gallery/GalleryWall";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const steps = [
  { icon: "link", title: "凭邀请链接进来", desc: "社团在群里发链接，点开输入 QQ 号就行，不用注册。" },
  { icon: "palette", title: "拖拖拽拽做设计", desc: "套模板、把图拖进照片位、加文字和贴纸，正反两面都能改。" },
  { icon: "printer", title: "我们拿去印", desc: "提交后你能马上下载留底，社团审核通过就进印刷清单。" },
];

export default async function Home() {
  ensureConfig();
  const me = await currentUser();

  const wall = SITE.showGallery;
  const approvedOnly = SITE.galleryApprovedOnly;
  const items = wall ? listGallery({ approvedOnly, limit: 48 }).map(publicGalleryItem) : [];
  const total = wall ? countGallery(approvedOnly) : 0;
  const authors = wall ? countGalleryAuthors(approvedOnly) : 0;
  const cam = campaignStatus();

  return (
    <main className="bg-dreamy bg-dots relative min-h-dvh">
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <p className="font-cute text-sakura-500 mb-2 text-sm tracking-widest">{SITE.clubName}</p>
        <h1 className="font-cute text-ink-900 text-4xl leading-tight sm:text-5xl">
          做一张<span className="text-sakura-500">只属于你</span>的明信片
        </h1>
        <p className="text-ink-600 mt-4 max-w-xl leading-relaxed">
          往年的周边都是我们几个人闷头做的，今年想换个玩法：物料由大家一起设计。
          你在这里画好，我们统一印出来，招新和漫展现场发。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {me ? (
            <>
              <Link href="/editor" className="btn btn-primary px-5 py-2.5 text-sm">
                继续设计
                <Icon name="chevronRight" size={15} />
              </Link>
              <Link href="/my" className="btn btn-ghost px-5 py-2.5 text-sm">
                我的作品
              </Link>
            </>
          ) : (
            <span className="text-ink-400 text-xs">
              这个站只对拿到邀请链接的人开放，去社团群里找那条{" "}
              <span className="text-sakura-600 font-mono">/i/xxxxx</span> 的链接。
            </span>
          )}
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="card-soft p-4">
              <span className="bg-sakura-50 text-sakura-600 grid h-9 w-9 place-items-center rounded-xl">
                <Icon name={s.icon} size={18} />
              </span>
              <div className="font-cute text-ink-900 mt-2.5">{s.title}</div>
              <p className="text-ink-400 mt-1 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="card-soft mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          {cam.cap > 0 && (
            <>
              <span className="text-ink-400">本次征集</span>
              <span className="text-ink-800 font-medium">
                {cam.full ? "已经收满" : `还能收 ${cam.left} 张`}
                <span className="text-ink-400 font-normal">（共 {cam.cap} 张）</span>
              </span>
            </>
          )}
          <span className="text-ink-400">成品规格</span>
          <span className="text-ink-800 font-medium">
            {SPEC.widthMm} × {SPEC.heightMm} mm
          </span>
          <span className="text-ink-400">出血 {SPEC.bleedMm}mm</span>
          <span className="text-ink-400">{SPEC.dpi}dpi 印刷级</span>
        </div>

        {wall && (
          <GalleryWall items={items} total={total} authors={authors} cap={cam.cap} />
        )}

        <div className="border-sakura-300 mt-12 rounded-2xl border border-dashed bg-white/70 p-5 text-center">
          <p className="text-ink-600 text-sm">
            想加入就找管理员要一条邀请链接。
            <br className="sm:hidden" />
            已经有链接的直接点开就能开始。
          </p>
          <Link href="/admin" className="text-ink-400 mt-3 inline-block text-xs underline">
            我是管理员
          </Link>
        </div>
      </div>
    </main>
  );
}
