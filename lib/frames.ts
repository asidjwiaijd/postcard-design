/**
 * 照片蒙板（剪贴蒙板）。
 *
 * 路径一律画在 0~1 的单位正方形里，用的时候按元素的宽高做非等比缩放：
 *  - Konva：Path2D + DOMMatrix(w,0,0,h,0,0)，交给 Group.clipFunc
 *  - DOM 预览：<svg viewBox="0 0 1 1" preserveAspectRatio="none">
 * 同一份 d 两边都能用，不必维护两套形状。
 */

export interface FrameDef {
  id: string;
  name: string;
  /** 单位正方形内的路径 */
  d: string;
  /** 建议宽高比（宽/高），插入空位时用 */
  ratio?: number;
}

const f = (n: number) => n.toFixed(4).replace(/\.?0+$/, "");
const pt = (r: number, a: number) => `${f(0.5 + r * Math.cos(a))} ${f(0.5 + r * Math.sin(a))}`;

/** 正多角星 */
function star(points: number, inner: number) {
  const seg: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    seg.push(pt(i % 2 ? inner : 0.5, (Math.PI * i) / points - Math.PI / 2));
  }
  return `M${seg.join("L")}Z`;
}

/** 花瓣：每片一段三次贝塞尔，中心补一个圆把缝合上（nonzero 填充规则下自然并成一体） */
function flower(n: number) {
  const base = 0.17;
  const ctrl = 0.68;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (2 * Math.PI * i) / n - Math.PI / 2;
    const a1 = (2 * Math.PI * (i + 1)) / n - Math.PI / 2;
    const mid = (a0 + a1) / 2;
    const spread = (a1 - a0) * 0.42;
    d += `M${pt(base, a0)}C${pt(ctrl, mid - spread)} ${pt(ctrl, mid + spread)} ${pt(base, a1)}Z`;
  }
  // 中心补圆的绕向必须和花瓣一致（都顺时针），否则 nonzero 规则会把中间挖空
  const cr = base * 2.1;
  d += `M${f(0.5 - cr)} .5A${f(cr)} ${f(cr)} 0 1 1 ${f(0.5 + cr)} .5A${f(cr)} ${f(cr)} 0 1 1 ${f(0.5 - cr)} .5Z`;
  return d;
}

/** 邮票齿孔：顺时针绕一圈，每段挖一个半圆，所以 sweep 恒为 1 */
function stamp(nx: number, ny: number, depth: number) {
  const sx = 1 / nx;
  const sy = 1 / ny;
  let d = "M0 0";
  for (let i = 1; i <= nx; i++) d += `A${f(sx / 2)} ${f(depth)} 0 0 1 ${f(i * sx)} 0`;
  for (let i = 1; i <= ny; i++) d += `A${f(depth)} ${f(sy / 2)} 0 0 1 1 ${f(i * sy)}`;
  for (let i = nx - 1; i >= 0; i--) d += `A${f(sx / 2)} ${f(depth)} 0 0 1 ${f(i * sx)} 1`;
  for (let i = ny - 1; i >= 0; i--) d += `A${f(depth)} ${f(sy / 2)} 0 0 1 0 ${f(i * sy)}`;
  return d + "Z";
}

/** 不规则有机形：给一圈半径，用 Catmull-Rom 转贝塞尔连成闭合曲线 */
function blob(radii: number[]) {
  const n = radii.length;
  const at = (i: number) => {
    const k = ((i % n) + n) % n;
    const a = (2 * Math.PI * k) / n - Math.PI / 2;
    return [0.5 + radii[k] * Math.cos(a), 0.5 + radii[k] * Math.sin(a)] as const;
  };
  let d = `M${f(at(0)[0])} ${f(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}`;
    d += ` ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}`;
    d += ` ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

const ellipse = "M0 .5A.5 .5 0 0 1 1 .5A.5 .5 0 0 1 0 .5Z";

export const FRAMES: FrameDef[] = [
  { id: "rect", name: "方形", d: "M0 0H1V1H0Z" },
  { id: "round", name: "圆角", d: "M.14 0H.86A.14 .14 0 0 1 1 .14V.86A.14 .14 0 0 1 .86 1H.14A.14 .14 0 0 1 0 .86V.14A.14 .14 0 0 1 .14 0Z" },
  { id: "circle", name: "圆形", d: ellipse, ratio: 1 },
  { id: "arch", name: "拱门", d: "M0 1V.44A.5 .44 0 0 1 1 .44V1Z", ratio: 0.78 },
  { id: "leaf", name: "叶形", d: "M0 .38A.38 .38 0 0 1 .38 0H1V.62A.38 .38 0 0 1 .62 1H0Z" },
  { id: "diamond", name: "菱形", d: "M.5 0 1 .5.5 1 0 .5Z", ratio: 1 },
  { id: "hex", name: "六边形", d: "M.5 0 1 .26V.74L.5 1 0 .74V.26Z", ratio: 0.9 },
  { id: "heart", name: "爱心", d: "M.5 1C.14 .72 0 .49 0 .3 0 .12 .14 0 .28 0 .39 0 .47 .07 .5 .16 .53 .07 .61 0 .72 0 .86 0 1 .12 1 .3 1 .49 .86 .72 .5 1Z", ratio: 1.05 },
  { id: "star", name: "星形", d: star(5, 0.21), ratio: 1 },
  { id: "burst", name: "爆炸", d: star(12, 0.74), ratio: 1 },
  { id: "flower", name: "花瓣", d: flower(6), ratio: 1 },
  { id: "blob", name: "不规则", d: blob([0.5, 0.45, 0.49, 0.42, 0.5, 0.44]) },
  { id: "cloud", name: "云朵", d: "M.22 1A.22 .22 0 0 1 .18 .56A.27 .27 0 0 1 .64 .34A.21 .21 0 0 1 .96 .6A.2 .2 0 0 1 .82 1Z", ratio: 1.3 },
  { id: "ticket", name: "票根", d: "M0 0H1V.36C.88 .4 .88 .6 1 .64V1H0V.64C.12 .6 .12 .4 0 .36Z" },
  { id: "stamp", name: "邮票齿孔", d: stamp(9, 7, 0.028) },
];

export const frameById = (id: string | undefined) =>
  (id && FRAMES.find((x) => x.id === id)) || FRAMES[0];

/** 矩形不需要裁剪，走 Konva 自带的 cornerRadius 就行 */
export const isClipped = (id: string | undefined) => !!id && id !== "rect";
