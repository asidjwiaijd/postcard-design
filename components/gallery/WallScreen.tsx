"use client";

import Link from "next/link";
import { GalleryFlow } from "./GalleryFlow";
import { useGalleryFeed, useReducedMotion, type FeedInit } from "./feed";
import { Icon } from "@/components/ui/icons";

/**
 * 分享页 / 大屏页：整屏斜着流动的作品瀑布，中间浮着实时提交数。
 * 摊位上支个显示器挂着它就行，交一张这里十几秒内自己就多一张。
 */
export function WallScreen({
  siteName, clubName, ...init
}: FeedInit & { siteName: string; clubName: string }) {
  const { items, total, authors, cap, fresh } = useGalleryFeed(init);
  const still = useReducedMotion();
  const pct = cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : 0;

  return (
    <main className="bg-dreamy relative min-h-dvh overflow-hidden">
      {items.length > 0 && (
        <div className="absolute inset-0">
          {still ? (
            <div className="columns-2 gap-3 p-3 opacity-70 sm:columns-4 lg:columns-6 [&>*]:mb-3">
              {items.map((it) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={it.id} src={it.thumb} alt=""
                  className="block w-full break-inside-avoid rounded-xl shadow-sm ring-1 ring-black/5"
                />
              ))}
            </div>
          ) : (
            <GalleryFlow items={items} fresh={fresh} height="100%" tilt={-11} dense />
          )}
        </div>
      )}

      {/* 中间那块牌子：压在流动的图上面，所以要有底 */}
      <div className="pointer-events-none relative grid min-h-dvh place-items-center p-6">
        <div className="ring-sakura-100 pointer-events-auto w-full max-w-md rounded-[2rem] bg-white/82 p-7 text-center shadow-[0_30px_80px_-30px_rgba(236,59,118,0.55)] ring-1 backdrop-blur-md">
          <p className="font-cute text-sakura-500 text-xs tracking-[0.3em]">{clubName}</p>
          <h1 className="font-cute text-ink-900 mt-1 text-2xl">{siteName}</h1>

          <div className="mt-5 flex items-end justify-center gap-2">
            <span className="font-cute text-sakura-600 text-6xl leading-none tabular-nums">{total}</span>
            {cap > 0 && <span className="text-ink-400 mb-1 font-mono text-lg tabular-nums">/ {cap}</span>}
          </div>
          <p className="text-ink-600 mt-2 text-sm">
            张明信片已经交上来 · {authors} 位米娜参与
          </p>

          {cap > 0 && (
            <>
              <div className="bg-sakura-100 mt-4 h-2 overflow-hidden rounded-full">
                <div
                  className="from-sakura-400 to-sakura-600 h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-ink-400 mt-1.5 text-[11px]">
                {total >= cap ? "这次征集已经收满啦" : `还能收 ${cap - total} 张`}
              </p>
            </>
          )}

          <p className="text-ink-400 mt-5 flex items-center justify-center gap-1.5 text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="bg-sakura-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
              <span className="bg-sakura-500 relative inline-flex h-2 w-2 rounded-full" />
            </span>
            实时刷新 · 有人交稿这面墙就会多一张
          </p>

          <Link href="/" className="btn btn-ghost mt-5 px-4 py-2 text-xs">
            <Icon name="chevronLeft" size={14} />
            回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
