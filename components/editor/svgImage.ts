"use client";

import { useEffect, useState } from "react";
import { vectorSvg, vectorAspect } from "@/lib/vectors";
import { patternSvg } from "@/lib/patterns";
import { pageExportW, pageExportH, SPEC } from "@/lib/config";

/** 300dpi 下 1mm 等于多少像素 */
const pxPerMm = () => SPEC.dpi / 25.4;

/**
 * SVG 作为位图画到 canvas 时，清晰度取决于 <img> 的固有尺寸。
 * 这里按元素实际毫米宽度换算出印刷所需像素，再向上取到 2 的幂——
 * 这样元素被拖动缩放时不会每一帧都重新解码一张图。
 */
function rasterWidth(wMm: number) {
  const need = wMm * pxPerMm();
  let w = 256;
  while (w < need && w < 2048) w *= 2;
  return w;
}

const cache = new Map<string, HTMLImageElement>();

function loadSvg(key: string, svg: string): HTMLImageElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const img = new Image();
  img.decoding = "sync";
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  cache.set(key, img);
  return img;
}

function useLoaded(img: HTMLImageElement | null) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!img || img.complete) return;
    const on = () => force((n) => n + 1);
    img.addEventListener("load", on);
    img.addEventListener("error", on);
    return () => {
      img.removeEventListener("load", on);
      img.removeEventListener("error", on);
    };
  }, [img]);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export function useVectorImage(
  vectorId: string,
  color: string,
  color2: string | undefined,
  wMm: number,
) {
  const px = rasterWidth(wMm);
  const aspect = vectorAspect(vectorId);
  const key = `v|${vectorId}|${color}|${color2 ?? ""}|${px}`;
  const svg = cache.has(key)
    ? ""
    : vectorSvg(vectorId, color, color2).replace(
        "<svg ",
        `<svg width="${px}" height="${Math.round(px / aspect)}" `,
      );
  return useLoaded(loadSvg(key, svg));
}

export function usePatternImage(
  patternId: string | undefined,
  color: string,
  accent: string,
  opacity: number,
  turned = false,
) {
  const enabled = !!patternId && patternId !== "none";
  const key = `p|${patternId}|${color}|${accent}|${opacity}|${turned ? "v" : "h"}`;
  const svg =
    !enabled || cache.has(key)
      ? ""
      : patternSvg(patternId!, { color, accent, opacity, turned }).replace(
          /width="[^"]*" height="[^"]*"/,
          `width="${pageExportW(turned)}" height="${pageExportH(turned)}"`,
        );
  const img = useLoaded(enabled ? loadSvg(key, svg) : null);
  return enabled ? img : null;
}

/** 普通位图（用户上传 / 头像 / 贴纸），同源，无跨域污染 */
export function useRasterImage(src: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const hit = cache.get(`r|${src}`);
    if (hit?.complete && hit.naturalWidth > 0) {
      setImg(hit);
      return;
    }
    let alive = true;
    const el = hit ?? new Image();
    if (!hit) {
      el.src = src;
      cache.set(`r|${src}`, el);
    }
    const done = () => alive && setImg(el.naturalWidth > 0 ? el : null);
    if (el.complete) done();
    else {
      el.addEventListener("load", done);
      el.addEventListener("error", done);
    }
    return () => {
      alive = false;
      el.removeEventListener("load", done);
      el.removeEventListener("error", done);
    };
  }, [src]);
  return img;
}

/** 等待某一面用到的所有图片都解码完成——导出前必须调用 */
export async function waitForImages(srcs: string[]) {
  await Promise.all(
    srcs.map(
      (s) =>
        new Promise<void>((res) => {
          const img = cache.get(`r|${s}`);
          if (!img || img.complete) return res();
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        }),
    ),
  );
  const pending = [...cache.values()].filter((i) => !i.complete);
  await Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((res) => {
          img.addEventListener("load", () => res(), { once: true });
          img.addEventListener("error", () => res(), { once: true });
        }),
    ),
  );
}
