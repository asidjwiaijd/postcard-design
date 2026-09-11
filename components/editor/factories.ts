import { nanoid } from "nanoid";
import type { AnyElement, ShapeKind, TextElement } from "@/lib/types";
import { fontById } from "@/lib/fonts";
import { vectorAspect, VECTORS } from "@/lib/vectors";
import { pageW, pageH } from "@/lib/config";
import { frameById } from "@/lib/frames";
import { useEditor } from "./store";

/**
 * 新元素按「当前正在编辑的这一面」的版面算尺寸和居中位置——
 * 竖版页的长短边是对调的，照着横版算会插到纸外面去。
 */
function page() {
  const s = useEditor.getState();
  const turned = !!s.doc?.[s.side]?.turned;
  return { w: pageW(turned), h: pageH(turned) };
}
const center = (w: number, h: number) => {
  const p = page();
  return { x: (p.w - w) / 2, y: (p.h - h) / 2 };
};

export const TEXT_PRESETS = [
  { id: "h1", label: "大标题", fontId: "kuaile", fontSize: 10, bold: false, sample: "标题" },
  { id: "h2", label: "小标题", fontId: "sans", fontSize: 6, bold: true, sample: "小标题" },
  { id: "body", label: "正文", fontId: "wenkai", fontSize: 3.8, bold: false, sample: "在这里写下想说的话" },
  { id: "sign", label: "手写落款", fontId: "mashan", fontSize: 5, bold: false, sample: "—— 署名" },
] as const;

export function makeText(presetId: string): TextElement {
  const p = TEXT_PRESETS.find((t) => t.id === presetId) ?? TEXT_PRESETS[2];
  const w = Math.min(page().w - 20, p.sample.length * p.fontSize * 1.1 + 8);
  const h = p.fontSize * 1.5;
  return {
    id: nanoid(10),
    type: "text",
    ...center(w, h),
    w, h,
    rotation: 0,
    opacity: 1,
    text: p.sample,
    fontFamily: fontById(p.fontId).stack,
    fontSize: p.fontSize,
    fill: "#372f42",
    align: "left",
    lineHeight: 1.35,
    letterSpacing: 0,
    fontStyle: p.bold ? "bold" : "normal",
  };
}

export const SHAPES: { kind: ShapeKind; label: string; icon: string }[] = [
  { kind: "rect", label: "方块", icon: "square" },
  { kind: "ellipse", label: "圆", icon: "circle" },
  { kind: "triangle", label: "三角", icon: "triangle" },
  { kind: "star", label: "星星", icon: "star" },
  { kind: "heart", label: "心", icon: "heart" },
  { kind: "speech", label: "对话框", icon: "speech" },
  { kind: "line", label: "线条", icon: "line" },
];

export function makeShape(kind: ShapeKind): AnyElement {
  const w = kind === "line" ? 60 : 30;
  const h = kind === "line" ? 0.8 : 30;
  return {
    id: nanoid(10),
    type: "shape",
    shape: kind,
    ...center(w, h),
    w, h,
    rotation: 0,
    opacity: 1,
    fill: { type: "solid", color: "#ffb3d1" },
    stroke: "#ff5c91",
    strokeWidth: 0,
    radius: kind === "rect" ? 3 : 0,
  };
}

export function makeVector(vectorId: string): AnyElement {
  const def = VECTORS.find((v) => v.id === vectorId)!;
  const w = 28;
  const h = w / vectorAspect(vectorId);
  return {
    id: nanoid(10),
    type: "vector",
    vectorId,
    color: def.color,
    color2: def.color2,
    ...center(w, h),
    w, h,
    rotation: 0,
    opacity: 1,
  };
}

/** 空照片位：只有形状，没有图。双击它就能选图填进去 */
export function makeSlot(frame = "round"): AnyElement {
  const def = frameById(frame);
  const w = Math.min(62, page().w * 0.42);
  const h = w / (def.ratio ?? 1.25);
  return {
    id: nanoid(10),
    type: "image",
    assetId: "",
    src: "",
    frame,
    fit: "cover",
    ...center(w, h),
    w, h,
    rotation: 0,
    opacity: 1,
    radius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
  };
}

export function makeImage(
  assetId: string, src: string, naturalW: number, naturalH: number,
): AnyElement {
  // 默认占安全区一半宽，保持原图比例
  const pg = page();
  const w = Math.min(70, pg.w * 0.5);
  const h = naturalW && naturalH ? (w * naturalH) / naturalW : w * 0.7;
  const fitted = h > pg.h - 12 ? { w: ((pg.h - 12) * w) / h, h: pg.h - 12 } : { w, h };
  return {
    id: nanoid(10),
    type: "image",
    assetId,
    src,
    fit: "cover",
    ...center(fitted.w, fitted.h),
    ...fitted,
    rotation: 0,
    opacity: 1,
    radius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
  };
}

export function makeSticker(assetId: string, src: string, naturalW: number, naturalH: number): AnyElement {
  const w = 34;
  const h = naturalW && naturalH ? (w * naturalH) / naturalW : w;
  return {
    id: nanoid(10),
    type: "sticker",
    assetId,
    src,
    ...center(w, h),
    w, h,
    rotation: 0,
    opacity: 1,
  };
}

export const BG_PRESETS: { name: string; fill: import("@/lib/types").Fill }[] = [
  { name: "纯白", fill: { type: "solid", color: "#ffffff" } },
  { name: "奶油", fill: { type: "solid", color: "#fffdf7" } },
  { name: "樱粉", fill: { type: "solid", color: "#fff5f9" } },
  { name: "夜幕", fill: { type: "solid", color: "#2b2440" } },
  { name: "粉紫渐变", fill: { type: "linear", color: "#ffb3d1", color2: "#b9a7ff", angle: 35 } },
  { name: "晨曦", fill: { type: "linear", color: "#ffe1a3", color2: "#ffb3d1", angle: 20 } },
  { name: "薄荷", fill: { type: "linear", color: "#d8f3ec", color2: "#bfe0ff", angle: 40 } },
  { name: "深空", fill: { type: "linear", color: "#2b2440", color2: "#5b3f7a", angle: 35 } },
];
