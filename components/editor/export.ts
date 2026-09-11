"use client";

import type Konva from "konva";
import type { DesignDoc, SideId } from "@/lib/types";
import { SPEC, pageExportW, pageExportH } from "@/lib/config";
import { ensureFonts } from "@/lib/fonts";
import { waitForImages } from "./svgImage";

/**
 * 把某一面的内容层渲染成 300dpi 的 PNG。
 * 预览层是按 scale (px/mm) 画的，所以放大倍数 = 印刷像素密度 / 预览像素密度。
 */
export async function renderSide(
  layer: Konva.Layer,
  previewScale: number,
  hideIds: string[] = [],
  turned = false,
): Promise<Blob> {
  const pixelRatio = SPEC.dpi / 25.4 / previewScale;
  // 没放图的照片位在画布上是虚线占位，印出来就成了一圈虚线，导出时先藏起来
  const hidden = hideIds
    .map((id) => layer.findOne(`#${id}`))
    .filter((n): n is Konva.Node => !!n);
  hidden.forEach((n) => n.visible(false));
  try {
    return await toBlob(layer, pixelRatio, turned);
  } finally {
    hidden.forEach((n) => n.visible(true));
    layer.batchDraw();
  }
}

function toBlob(layer: Konva.Layer, pixelRatio: number, turned: boolean): Promise<Blob> {
  const canvas = layer.toCanvas({
    x: 0,
    y: 0,
    // 竖版那一面的画幅是转过来的
    width: Math.round(pageExportW(turned) / pixelRatio),
    height: Math.round(pageExportH(turned) / pixelRatio),
    pixelRatio,
  } as unknown as Parameters<Konva.Layer["toCanvas"]>[0]);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("画布导出失败"))),
      "image/png",
    );
  });
}

/** 导出前必须做的准备：字体真正加载 + 图片全部解码 */
export async function prepareForExport(doc: DesignDoc) {
  const texts: { stack: string; text: string }[] = [];
  const srcs: string[] = [];
  for (const side of ["front", "back"] as SideId[]) {
    for (const el of doc[side].elements) {
      if (el.type === "text") texts.push({ stack: el.fontFamily, text: el.text });
      if (el.type === "image" || el.type === "sticker") srcs.push(el.src);
    }
  }
  await ensureFonts(texts);
  await waitForImages(srcs);
  // 字体换上后 Konva 需要重新度量一次
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
