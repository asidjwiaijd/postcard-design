/**
 * 背面底纹生成器。全部按毫米作图，viewBox 就是含出血的整版，
 * 因此同一份 SVG 在屏幕预览和 300dpi 导出时完全一致。
 */
import { SPEC, pageW, pageH } from "./config";

export interface PatternDef {
  id: string;
  name: string;
  desc: string;
  /** 默认主色 / 点缀色 */
  color: string;
  accent: string;
}

export const PATTERNS: PatternDef[] = [
  { id: "none", name: "无底纹", desc: "完全空白，自由发挥", color: "#d4477a", accent: "#94a3b8" },
  { id: "cn-post", name: "国内明信片", desc: "六格邮政编码 + 邮票框 + 地址线", color: "#e0447c", accent: "#9aa4b2" },
  { id: "cn-post-mini", name: "国内·简版", desc: "只留邮编格与分割线", color: "#e0447c", accent: "#9aa4b2" },
  { id: "jp-post", name: "日式年贺状", desc: "右侧竖排邮编格，适合竖排文字", color: "#d4383f", accent: "#a3a3a3" },
  { id: "letter", name: "信纸横线", desc: "整面横线，写长信用", color: "#f0a8c4", accent: "#c7d2e0" },
  { id: "grid", name: "方格本", desc: "淡淡的方格底", color: "#e7c3d6", accent: "#dbe3ec" },
  { id: "dots", name: "圆点网格", desc: "点阵底纹，干净好搭", color: "#e7c3d6", accent: "#dbe3ec" },
  { id: "sakura", name: "樱花飘落", desc: "角落散落花瓣，二次元向", color: "#f7a8c4", accent: "#fce7f0" },
];

/**
 * 正在生成的这一面是不是竖版（长短边对调）。底纹是整页作图的，
 * 竖版页要按换过来的尺寸排，否则邮编格会跑到纸外面去。
 * 生成过程是同步的，用一个模块级开关就够，patternSvg 负责进出时收拾干净。
 */
let pageTurned = false;

// 规格后台可改，取值要推迟到调用时
const B_ = () => SPEC.bleedMm;
const TW_ = () => (pageTurned ? SPEC.heightMm : SPEC.widthMm);
const TH_ = () => (pageTurned ? SPEC.widthMm : SPEC.heightMm);

/** 把成品坐标换算到含出血画布坐标 */
const tx = (x: number) => B_() + x;
const ty = (y: number) => B_() + y;

interface Opts {
  color: string;
  accent: string;
  opacity: number;
  /** 这一面是竖版 */
  turned: boolean;
}

function codeBoxes(x0: number, y0: number, n: number, w: number, h: number, gap: number, color: string) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = tx(x0 + i * (w + gap));
    s += `<rect x="${x}" y="${ty(y0)}" width="${w}" height="${h}" rx="0.8" fill="none" stroke="${color}" stroke-width="0.4"/>`;
    // 邮编格内部的十字定位虚线
    s += `<path d="M ${x + w / 2} ${ty(y0) + 1.6} V ${ty(y0) + h - 1.6}" stroke="${color}" stroke-width="0.18" stroke-dasharray="0.7 0.9" opacity="0.55"/>`;
  }
  return s;
}

function stampFrame(x: number, y: number, w: number, h: number, color: string, label: string) {
  return `
    <rect x="${tx(x)}" y="${ty(y)}" width="${w}" height="${h}" rx="1" fill="none"
      stroke="${color}" stroke-width="0.35" stroke-dasharray="1.6 1.2"/>
    <text x="${tx(x + w / 2)}" y="${ty(y + h / 2)}" font-size="2.6" fill="${color}"
      text-anchor="middle" dominant-baseline="middle" font-family="sans-serif"
      letter-spacing="0.3">${label}</text>`;
}

function ruledLines(x: number, y: number, w: number, count: number, gap: number, color: string, dash = false) {
  let s = "";
  for (let i = 0; i < count; i++) {
    s += `<path d="M ${tx(x)} ${ty(y + i * gap)} H ${tx(x + w)}" stroke="${color}" stroke-width="0.25"${
      dash ? ' stroke-dasharray="1.4 1.1"' : ""
    }/>`;
  }
  return s;
}

function sakuraPetal(cx: number, cy: number, r: number, rot: number, color: string, opacity = 1) {
  // 花瓣尖端带缺口，是樱花区别于普通五瓣花的关键特征
  const d = `M 0 0 C ${r * 0.42} ${-r * 0.42}, ${r * 0.9} ${-r * 0.4}, ${r} ${-r * 0.1}
             L ${r * 0.82} ${0} L ${r} ${r * 0.1}
             C ${r * 0.9} ${r * 0.4}, ${r * 0.42} ${r * 0.42}, 0 0 Z`;
  let p = "";
  for (let i = 0; i < 5; i++) {
    p += `<path d="${d}" transform="rotate(${rot + (i * 360) / 5})" fill="${color}"/>`;
  }
  return `<g transform="translate(${cx} ${cy})" opacity="${opacity}">${p}<circle r="${r * 0.16}" fill="#fff" opacity="0.55"/></g>`;
}

function body(id: string, o: Opts): string {
  const { color: c, accent: a } = o;
  switch (id) {
    case "cn-post":
      return `
        ${codeBoxes(6, 5, 6, 7, 9.5, 1.6, c)}
        <text x="${tx(6)}" y="${ty(18)}" font-size="2" fill="${c}" font-family="sans-serif" opacity="0.75">收件人邮政编码</text>
        ${stampFrame(TW_() - 26, 5, 20, 24, a, "贴邮票")}
        <path d="M ${tx(TW_() * 0.5)} ${ty(22)} V ${ty(TH_() - 6)}" stroke="${a}" stroke-width="0.3" stroke-dasharray="1.8 1.4"/>
        <text x="${tx(TW_() * 0.5 + 4)}" y="${ty(34)}" font-size="2.4" fill="${a}" font-family="sans-serif">收件人</text>
        ${ruledLines(TW_() * 0.5 + 4, 38, TW_() * 0.5 - 10, 4, 9, a, true)}
        <text x="${tx(6)}" y="${ty(TH_() - 17.5)}" font-size="2" fill="${a}" font-family="sans-serif">寄件人邮政编码</text>
        ${codeBoxes(6, TH_() - 16, 6, 4.6, 6, 1, a)}`;
    case "cn-post-mini":
      return `
        ${codeBoxes(6, 5, 6, 7, 9.5, 1.6, c)}
        <path d="M ${tx(TW_() * 0.52)} ${ty(6)} V ${ty(TH_() - 6)}" stroke="${a}" stroke-width="0.3" stroke-dasharray="1.8 1.4"/>
        ${stampFrame(TW_() - 26, 5, 20, 24, a, "贴邮票")}`;
    case "jp-post": {
      let boxes = "";
      for (let i = 0; i < 7; i++) {
        const x = TW_() - 10 - i * 6.4;
        boxes += `<rect x="${tx(x)}" y="${ty(5)}" width="5.4" height="7" rx="0.6" fill="none" stroke="${c}" stroke-width="0.4"/>`;
      }
      return `
        ${boxes}
        <path d="M ${tx(6)} ${ty(16)} V ${ty(TH_() - 6)}" stroke="${a}" stroke-width="0.25" stroke-dasharray="1.2 1.2"/>
        <path d="M ${tx(TW_() - 6)} ${ty(16)} V ${ty(TH_() - 6)}" stroke="${a}" stroke-width="0.25" stroke-dasharray="1.2 1.2"/>
        ${stampFrame(6, 5, 18, 22, a, "切手")}`;
    }
    case "letter":
      return ruledLines(8, 14, TW_() - 16, Math.floor((TH_() - 22) / 8), 8, c);
    case "grid": {
      let s = "";
      for (let x = 0; x <= TW_(); x += 5) s += `<path d="M ${tx(x)} ${ty(0)} V ${ty(TH_())}" stroke="${a}" stroke-width="0.15"/>`;
      for (let y = 0; y <= TH_(); y += 5) s += `<path d="M ${tx(0)} ${ty(y)} H ${tx(TW_())}" stroke="${a}" stroke-width="0.15"/>`;
      return s;
    }
    case "dots": {
      let s = "";
      for (let x = 2.5; x < TW_(); x += 5)
        for (let y = 2.5; y < TH_(); y += 5)
          s += `<circle cx="${tx(x)}" cy="${ty(y)}" r="0.35" fill="${c}"/>`;
      return s;
    }
    case "sakura": {
      // [x, y, 半径, 旋转, 透明度] —— 手摆位置，聚在左上/右下两角，中间留白给文字
      const pts: [number, number, number, number, number][] = [
        [2, 4, 4.2, 12, 1], [12, 1, 2.6, 40, 0.9], [7, 13, 1.9, 70, 0.75],
        [19, 9, 1.4, 20, 0.55], [-1, 15, 2.2, 55, 0.7], [24, 2, 1.2, 8, 0.5],
        [TW_() - 3, TH_() - 5, 4.4, 25, 1], [TW_() - 14, TH_() - 2, 2.5, 55, 0.9],
        [TW_() - 8, TH_() - 15, 1.8, 5, 0.75], [TW_() - 21, TH_() - 9, 1.3, 35, 0.55],
        [TW_() + 1, TH_() - 17, 2, 65, 0.6], [TW_() - 26, TH_() - 1, 1.1, 15, 0.5],
        [TW_() - 5, 6, 2.2, 80, 0.45], [5, TH_() - 6, 2, 30, 0.45],
      ];
      return pts.map(([x, y, r, rot, op]) => sakuraPetal(tx(x), ty(y), r, rot, c, op)).join("");
    }
    default:
      return "";
  }
}

export function patternSvg(id: string, opts: Partial<Opts> = {}): string {
  const def = PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
  const o: Opts = {
    color: opts.color ?? def.color,
    accent: opts.accent ?? def.accent,
    opacity: opts.opacity ?? 1,
    turned: opts.turned ?? false,
  };
  pageTurned = o.turned;
  try {
    const w = pageW(o.turned), h = pageH(o.turned);
    const inner = body(id, o);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><g opacity="${o.opacity}">${inner}</g></svg>`;
  } finally {
    pageTurned = false;
  }
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
