"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WallItem {
  id: string;
  thumb: string;
  status: string;
  nickname: string;
  createdAt: number;
}

export interface FeedInit {
  items: WallItem[];
  total: number;
  authors: number;
  /** 这次征集的上限，0 = 不限 */
  cap: number;
}

const POLL_MS = 12_000;
const MAX_ITEMS = 60;

/** 相对时间，精确到分钟就够了 */
export function ago(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

/**
 * 实时作品流。每 12 秒问一次有没有新稿，只取比手上最新一张更晚的；
 * 页面在后台时不轮询——没人看的时候没必要一直打服务器。
 */
export function useGalleryFeed(init: FeedInit) {
  const [items, setItems] = useState(init.items);
  const [total, setTotal] = useState(init.total);
  const [authors, setAuthors] = useState(init.authors);
  const [cap, setCap] = useState(init.cap);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const newest = useRef(init.items[0]?.createdAt ?? 0);

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const r = await fetch(`/api/gallery?after=${newest.current}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as {
        total: number; authors: number; items: WallItem[]; campaign?: { cap: number };
      };
      setTotal(d.total);
      setAuthors(d.authors);
      if (d.campaign) setCap(d.campaign.cap);
      if (d.items.length) {
        newest.current = Math.max(newest.current, ...d.items.map((i) => i.createdAt));
        setItems((cur) => {
          const seen = new Set(cur.map((i) => i.id));
          const add = d.items.filter((i) => !seen.has(i.id));
          if (!add.length) return cur;
          setFresh(new Set(add.map((i) => i.id)));
          return [...add, ...cur].slice(0, MAX_ITEMS);
        });
      }
    } catch {
      /* 网络抖一下就算了，下一轮再说 */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(poll, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [poll]);

  // 「x 分钟前」自己会过期，每分钟重算一次
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!fresh.size) return;
    const t = setTimeout(() => setFresh(new Set()), 2600);
    return () => clearTimeout(t);
  }, [fresh]);

  return { items, total, authors, cap, fresh, now };
}

/**
 * 系统里关了动效就别让整面墙自己滚——globals.css 里那条全局
 * prefers-reduced-motion 规则会把动画时长压到 0，滚动会变成乱跳。
 */
export function useReducedMotion() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return still;
}

/**
 * 按列分配。min 是「每列至少要几张」——稿子少的时候把同一批图再铺几遍，
 * 否则滚到一半列就走完了，下面会露白。
 */
export function toColumns(items: WallItem[], cols: number, min = 4): WallItem[][] {
  const out: WallItem[][] = Array.from({ length: cols }, () => []);
  if (!items.length) return out;
  items.forEach((it, i) => out[i % cols].push(it));
  return out.map((col) => {
    const base = col.length ? col : items;
    const filled = [...base];
    while (filled.length < min) filled.push(...base);
    return filled;
  });
}
