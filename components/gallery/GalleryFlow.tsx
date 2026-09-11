"use client";

import { useEffect, useRef, useState } from "react";
import { toColumns, type WallItem } from "./feed";

/** 平面比容器宽多少、整体放大多少——转过角度之后要靠它盖住四个角 */
const PLANE = 1.5;
const SCALE = 1.25;

/**
 * 斜着流动的作品瀑布。整个平面转一个角度再放大盖住四角，
 * 每一列各自上下匀速滚，奇数列反着走，看上去就是一面活的墙。
 * 列内容复制了一份，动画走到 -50% 正好接回开头，因此看不出断点——
 * 前提是「一份」本身就比可见高度长，否则滚到一半下面会露白，
 * 所以下面按容器实测尺寸算每列至少要铺几张。
 */
export function GalleryFlow({
  items,
  fresh,
  height = 460,
  tilt = -9,
  dense = false,
}: {
  items: WallItem[];
  fresh?: Set<string>;
  height?: number | string;
  /** 倾角，度 */
  tilt?: number;
  /** 投影用：列更多、图更小 */
  dense?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // 列数按容器实际宽度算（首页那面墙是放在窄栏里的，不能拿视口宽度当准）
  const planeW = (box.w || 1200) * PLANE;
  const target = dense ? 190 : 240;
  const cols = Math.max(3, Math.min(14, Math.round((planeW * SCALE) / target)));

  // 一列至少要铺多长：盖住可见高度 + 转角带来的富余
  const colW = planeW / cols;
  const cardH = colW * 0.72 + 26;
  const needH = (box.h || 460) / SCALE + colW;
  const minCards = Math.ceil(needH / cardH) + 1;

  const columns = toColumns(items, cols, minCards);

  return (
    <div ref={wrapRef} className="pc-flow relative overflow-hidden" style={{ height }}>
      <div
        className="absolute left-1/2 top-1/2 flex gap-3"
        style={{
          width: `${PLANE * 100}%`,
          transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${SCALE})`,
        }}
      >
        {columns.map((col, i) => (
          <div
            key={i}
            className="pc-flow-col flex-1 space-y-3"
            data-rev={i % 2 === 1 ? "1" : undefined}
            style={{ ["--dur" as string]: `${52 + i * 9}s` }}
          >
            {[...col, ...col].map((it, j) => (
              <figure
                key={`${it.id}-${j}`}
                className={`overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_-16px_rgba(236,59,118,0.6)] ring-1 ${
                  fresh?.has(it.id) ? "ring-sakura-400 ring-2" : "ring-black/5"
                }`}
              >
                {/*
                  别用 loading="lazy"：这一片在转过角度的容器里滚，浏览器判定它在视口外
                  就不加载，图没高度、整列就塌了。墙上最多 60 张缩略图，直接加载扛得住。
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.thumb} alt={`${it.nickname} 的明信片`} className="block w-full" />
                <figcaption className="text-ink-400 truncate px-2 py-1 text-[10px]">
                  {it.nickname}
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
