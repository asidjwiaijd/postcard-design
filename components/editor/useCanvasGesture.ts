"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

interface Opts {
  /** 可视区（画布外面那块），手势监听挂在它上面 */
  host: RefObject<HTMLElement | null>;
  /** 卡片本体，手势期间直接改它的 transform */
  plate: RefObject<HTMLElement | null>;
  zoom: number;
  setZoom: (z: number) => void;
  /** 画布挂上来了没有。<main> 要等稿子就绪才渲染，早了拿不到 host */
  ready: boolean;
  min?: number;
  max?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * 双指缩放 / 平移。
 *
 * 手势进行中只改 CSS transform：Konva 的 scale 是 React 属性，跟着手指改会把
 * 整棵元素树每帧重渲一遍，手机上根本跟不上。松手时才把倍率并进 zoom，
 * 让画布按新分辨率重画一次——中间那几十帧交给 GPU，完全跟手。
 *
 * 卡片是在可视区里居中的，CSS 缩放和改 zoom 都是绕同一个中心放大，
 * 所以并进去的那一下画面不会跳。
 */
export function useCanvasGesture({ host, plate, zoom, setZoom, ready, min = 0.5, max = 4 }: Opts) {
  const pan = useRef({ x: 0, y: 0 });
  const mult = useRef(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const apply = useCallback(() => {
    const el = plate.current;
    if (!el) return;
    const { x, y } = pan.current;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${mult.current})`;
  }, [plate]);

  /** 别让卡片被推到完全看不见 */
  const clampPan = useCallback((p: { x: number; y: number }, m: number) => {
    const h = host.current, el = plate.current;
    if (!h || !el) return p;
    const hb = h.getBoundingClientRect();
    const mx = Math.max(0, (el.offsetWidth * m - hb.width) / 2) + 40;
    const my = Math.max(0, (el.offsetHeight * m - hb.height) / 2) + 40;
    return { x: clamp(p.x, -mx, mx), y: clamp(p.y, -my, my) };
  }, [host, plate]);

  const resetPan = useCallback(() => {
    pan.current = { x: 0, y: 0 };
    mult.current = 1;
    apply();
  }, [apply]);

  useEffect(() => {
    const h = host.current;
    if (!h) return;

    let g: {
      dist: number;
      mid: { x: number; y: number };
      /** 手势开始时卡片在屏幕上的中心 */
      cc: { x: number; y: number };
      pan0: { x: number; y: number };
    } | null = null;

    const midOf = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });
    const distOf = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !plate.current) return;
      const r = plate.current.getBoundingClientRect();
      g = {
        dist: distOf(e.touches) || 1,
        mid: midOf(e.touches),
        cc: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
        pan0: { ...pan.current },
      };
    };

    const onMove = (e: TouchEvent) => {
      if (!g || e.touches.length < 2) return;
      if (e.cancelable) e.preventDefault();
      const z = zoomRef.current;
      // 倍率先按总 zoom 夹一遍，手势里就不会拉到越界又弹回来
      const m = clamp(distOf(e.touches) / g.dist, min / z, max / z);
      const mid = midOf(e.touches);
      // 捏住的那个点要一直贴在两指中间
      const next = {
        x: g.pan0.x + (mid.x - g.cc.x) - m * (g.mid.x - g.cc.x),
        y: g.pan0.y + (mid.y - g.cc.y) - m * (g.mid.y - g.cc.y),
      };
      mult.current = m;
      pan.current = clampPan(next, m);
      apply();
    };

    const onEnd = (e: TouchEvent) => {
      if (!g || e.touches.length >= 2) return;
      g = null;
      const next = clamp(zoomRef.current * mult.current, min, max);
      mult.current = 1;
      // 缩回适应窗口就顺手把偏移也归零，不然会剩下一块空白边
      if (next <= 1.001) pan.current = { x: 0, y: 0 };
      else pan.current = clampPan(pan.current, 1);
      apply();
      if (Math.abs(next - zoomRef.current) > 0.001) setZoom(next);
    };

    /** 触控板捏合 / Ctrl+滚轮：绕光标缩放 */
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!plate.current) return;
      e.preventDefault();
      const z = zoomRef.current;
      const next = clamp(z * Math.exp(-e.deltaY / 260), min, max);
      const m = next / z;
      const r = plate.current.getBoundingClientRect();
      const cc = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const p = {
        x: pan.current.x + (1 - m) * (e.clientX - cc.x),
        y: pan.current.y + (1 - m) * (e.clientY - cc.y),
      };
      pan.current = next <= 1.001 ? { x: 0, y: 0 } : clampPan(p, m);
      apply();
      if (Math.abs(next - z) > 0.001) setZoom(next);
    };

    h.addEventListener("touchstart", onStart, { passive: true });
    h.addEventListener("touchmove", onMove, { passive: false });
    h.addEventListener("touchend", onEnd, { passive: true });
    h.addEventListener("touchcancel", onEnd, { passive: true });
    h.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      h.removeEventListener("touchstart", onStart);
      h.removeEventListener("touchmove", onMove);
      h.removeEventListener("touchend", onEnd);
      h.removeEventListener("touchcancel", onEnd);
      h.removeEventListener("wheel", onWheel);
    };
  }, [host, plate, apply, clampPan, setZoom, ready, min, max]);

  return { resetPan };
}
