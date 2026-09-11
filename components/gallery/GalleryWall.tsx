"use client";

import Link from "next/link";
import { GalleryFlow } from "./GalleryFlow";
import { ago, useGalleryFeed, useReducedMotion, type FeedInit } from "./feed";
import { Icon } from "@/components/ui/icons";

/** 首页上的实时作品墙：一条斜着流动的瀑布 + 当前提交数 */
export function GalleryWall(init: FeedInit) {
  const { items, total, authors, cap, fresh, now } = useGalleryFeed(init);
  const still = useReducedMotion();
  const pct = cap > 0 ? Math.min(100, Math.round((total / cap) * 100)) : 0;

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-cute text-ink-900 text-2xl">大家已经做了</h2>
          <p className="text-ink-400 mt-1 text-xs">
            <span className="text-sakura-600 font-mono text-lg font-bold tabular-nums">{total}</span>
            {cap > 0 && <span className="text-ink-400 font-mono"> / {cap}</span>}
            <span> 张明信片 · </span>
            <span className="text-sakura-600 font-mono tabular-nums">{authors}</span>
            <span> 位米娜参与 · 有人交了这里会自己刷新</span>
          </p>
        </div>
        <span className="text-ink-400 flex items-center gap-3 text-[11px]">
          <Link href="/wall" className="hover:text-sakura-600 flex items-center gap-1 underline-offset-2 hover:underline">
            <Icon name="external" size={12} />
            大屏分享页
          </Link>
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="bg-sakura-400 absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
              <span className="bg-sakura-500 relative inline-flex h-2 w-2 rounded-full" />
            </span>
            实时
          </span>
        </span>
      </div>

      {cap > 0 && (
        <div className="bg-sakura-100 mb-4 h-1.5 overflow-hidden rounded-full">
          <div
            className="from-sakura-400 to-sakura-600 h-full rounded-full bg-gradient-to-r transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="border-sakura-200 rounded-2xl border border-dashed bg-white/70 p-12 text-center">
          <Icon name="image" size={28} className="text-sakura-300 mx-auto" />
          <p className="text-ink-600 mt-2 text-sm">还没有人交稿，第一张就交给你了</p>
        </div>
      ) : still ? (
        // 系统里关了动效：老老实实排成瀑布流
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {items.map((it) => (
            <figure
              key={it.id}
              className={`break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-14px_rgba(236,59,118,0.45)] ring-1 ${
                fresh.has(it.id) ? "ring-sakura-400 ring-2" : "ring-black/5"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb} alt={`${it.nickname} 的明信片`} loading="lazy" className="block w-full" />
              <figcaption className="text-ink-400 flex items-center justify-between gap-2 px-2.5 py-1.5 text-[10px]">
                <span className="text-ink-600 truncate">{it.nickname}</span>
                <span className="shrink-0">{ago(it.createdAt, now)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="ring-sakura-100 overflow-hidden rounded-3xl bg-white/50 ring-1">
          <GalleryFlow items={items} fresh={fresh} height={440} />
        </div>
      )}
    </section>
  );
}
