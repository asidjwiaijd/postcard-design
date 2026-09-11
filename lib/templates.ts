/**
 * 模板：一次插入一组排好版的元素。坐标全部是毫米，
 * 以含出血画布左上角为原点，安全区从 (bleed+safe) 开始。
 *
 * 模板里大量使用「照片位」——src 为空的 image 元素。它自带蒙板形状，
 * 在画布上是一个虚线的形状占位，双击就能选图填进去，图会按形状裁好。
 */
import { nanoid } from "nanoid";
import { SPEC, pageW, pageH, trimW, trimH } from "./config";
import type { AnyElement, DesignDoc, ImageElement, ShapeElement, SideDoc, SideId, TextElement } from "./types";
import { fontById } from "./fonts";

/**
 * 正在排的这一面是不是竖版。模板全部按 pw()/ph() 作图，所以同一套版式
 * 放到竖版页上也会自己撑开，不用另写一份。排版是同步的，一个模块级开关够用，
 * buildSide / buildBlock / buildDoc 负责进出时收拾干净。
 */
let pageTurned = false;
const pw = () => pageW(pageTurned);
const ph = () => pageH(pageTurned);
/** 成品（裁切后）宽高，底纹是按它排的，模板要跟它对齐 */
const tw_ = () => trimW(pageTurned);

// 规格可以在后台改，所以这些派生量必须调用时才算，不能在模块顶层快照
const B_ = () => SPEC.bleedMm;
const S_ = () => SPEC.bleedMm + SPEC.safeMm; // 安全区左上
const SAFE_W_ = () => trimW(pageTurned) - SPEC.safeMm * 2;
const SAFE_H_ = () => trimH(pageTurned) - SPEC.safeMm * 2;

export interface TemplateCtx {
  qq: string;
  nickname: string;
  avatar: string;
  clubName: string;
}

const id = () => nanoid(10);

function text(o: Partial<TextElement> & Pick<TextElement, "x" | "y" | "w" | "h" | "text">): TextElement {
  return {
    id: id(),
    type: "text",
    rotation: 0,
    opacity: 1,
    fontFamily: fontById("sans").stack,
    fontSize: 4,
    fill: "#372f42",
    align: "left",
    lineHeight: 1.35,
    letterSpacing: 0,
    fontStyle: "normal",
    ...o,
  };
}

/** 照片位。不给 src 就是空位，给了就是已经放好图 */
function slot(
  o: Partial<ImageElement> & Pick<ImageElement, "x" | "y" | "w" | "h">,
): ImageElement {
  return {
    id: id(),
    type: "image",
    assetId: "",
    src: "",
    frame: "rect",
    fit: "cover",
    rotation: 0,
    opacity: 1,
    radius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
    ...o,
  };
}

/**
 * 用户头像位，已经填好图。默认不描边——描边是真毫米，印出来就是圆圆一圈，
 * 想要的人在属性面板里自己加。
 */
const avatarSlot = (c: TemplateCtx, o: Partial<ImageElement> & Pick<ImageElement, "x" | "y" | "w" | "h">) =>
  slot({ assetId: `qq:${c.qq}`, src: `/api/qq/avatar/${c.qq}`, frame: "circle", ...o });

function rect(
  o: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "w" | "h" | "fill">,
): ShapeElement {
  return {
    id: id(), type: "shape", shape: "rect", rotation: 0, opacity: 1,
    radius: 0, strokeWidth: 0, stroke: "transparent", ...o,
  };
}

function vec(
  vectorId: string,
  o: { x: number; y: number; w: number; h: number; color?: string; color2?: string; rotation?: number; opacity?: number },
): AnyElement {
  return {
    id: id(), type: "vector", vectorId,
    color: o.color ?? "#ffc93c", color2: o.color2,
    x: o.x, y: o.y, w: o.w, h: o.h,
    rotation: o.rotation ?? 0, opacity: o.opacity ?? 1,
  };
}

/** 拍立得：白框 + 框内照片位，返回两个元素 */
function polaroid(x: number, y: number, w: number, rotation = 0): AnyElement[] {
  const h = w / 0.85;
  return [
    vec("frame-photo", { x, y, w, h, color: "#ffffff", color2: "#efe8f1", rotation }),
    slot({
      x: x + w * 0.07, y: y + h * 0.0593,
      w: w * 0.86, h: h * 0.7288,
      rotation, frame: "rect",
    }),
  ];
}

/**
 * 右下角落款：头像 + 昵称 / QQ。整块右边贴着安全区，
 * 竖版页也是照着当前版面算的，不会跑出去。
 * minX 是左边的底线（背面要让开邮政底纹那条分隔虚线），挤不下时文字自己变窄。
 */
function signature(c: TemplateCtx, minX = 0): AnyElement[] {
  const d = 11;                       // 头像直径
  const gap = 2;
  const right = pw() - S_();
  const left = Math.max(minX, right - (d + gap + 34));
  const tw = Math.max(20, right - left - d - gap);
  const y0 = ph() - S_() - d;
  return [
    avatarSlot(c, { x: left, y: y0, w: d, h: d }),
    text({
      x: left + d + gap, y: y0 + 1.2, w: tw, h: 9,
      text: `${c.nickname || "我"}\nQQ ${c.qq}`,
      fontSize: 3, lineHeight: 1.45, fill: "#8b8296",
    }),
  ];
}

// ---------------------------------------------------------------- 元素块

export interface BlockDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  build: (ctx: TemplateCtx) => AnyElement[];
}

export const BLOCKS: BlockDef[] = [
  {
    id: "photo-slot",
    name: "照片位",
    desc: "一个圆角照片位，双击就能放图",
    icon: "image",
    build: () => [slot({ x: S_() + 6, y: S_() + 6, w: 56, h: 42, frame: "round" })],
  },
  {
    id: "qq-card",
    name: "QQ 名片",
    desc: "自动带上你的头像、昵称和 QQ 号",
    icon: "idCard",
    build: (c) => [
      rect({ x: S_(), y: S_(), w: 62, h: 22, radius: 4, strokeWidth: 0.5, stroke: "#ffcfe1", fill: { type: "solid", color: "#ffffff" } }),
      avatarSlot(c, { x: S_() + 3, y: S_() + 3, w: 16, h: 16 }),
      text({ x: S_() + 22, y: S_() + 4.5, w: 37, h: 6, text: c.nickname || "我的昵称", fontSize: 4.6, fontStyle: "bold", fill: "#372f42" }),
      text({ x: S_() + 22, y: S_() + 11.5, w: 37, h: 5, text: `QQ ${c.qq}`, fontSize: 3.4, fill: "#8b8296" }),
    ],
  },
  {
    id: "contact",
    name: "联系方式",
    desc: "QQ / 微信 / B站，一行一个",
    icon: "mail",
    build: (c) => {
      const rows = [
        ["QQ", c.qq],
        ["微信", "你的微信号"],
        ["B站", "你的 B 站 ID"],
      ];
      const els: AnyElement[] = [
        text({ x: S_(), y: S_(), w: 50, h: 6, text: "找到我", fontSize: 5, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ec3b76" }),
      ];
      rows.forEach(([k, v], i) => {
        const y = S_() + 8.5 + i * 7;
        els.push(rect({ x: S_(), y, w: 13, h: 5.4, radius: 2.7, fill: { type: "solid", color: "#ffe7f0" } }));
        els.push(text({ x: S_(), y: y + 1, w: 13, h: 4, text: k, fontSize: 3.2, align: "center", fill: "#ec3b76", fontStyle: "bold" }));
        els.push(text({ x: S_() + 15, y: y + 0.8, w: 45, h: 4.5, text: v, fontSize: 3.6, fill: "#5b5266" }));
      });
      return els;
    },
  },
  {
    id: "message",
    name: "留言块",
    desc: "标题 + 正文 + 落款，写想说的话",
    icon: "pencil",
    build: (c) => [
      text({ x: S_(), y: S_(), w: SAFE_W_() * 0.55, h: 8, text: "写给你的话", fontSize: 6, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ec3b76" }),
      text({
        x: S_(), y: S_() + 10, w: SAFE_W_() * 0.55, h: 30,
        text: "在这里写下你想说的话。\n可以是入坑的契机，可以是一句安利，\n也可以只是「今天也要开心呀」。",
        fontSize: 3.8, lineHeight: 1.7, fill: "#5b5266", fontFamily: fontById("wenkai").stack,
      }),
      text({ x: S_(), y: S_() + 44, w: SAFE_W_() * 0.55, h: 6, text: `—— ${c.nickname || c.qq}`, fontSize: 3.6, align: "right", fill: "#8b8296", fontFamily: fontById("mashan").stack }),
    ],
  },
  {
    id: "club-info",
    name: "社团招新",
    desc: "社团名 + 一句话 + 招新信息",
    icon: "flag",
    build: (c) => [
      rect({ x: S_(), y: S_(), w: SAFE_W_(), h: 26, radius: 5, fill: { type: "linear", color: "#ffb3d1", color2: "#b9a7ff", angle: 20 } }),
      text({ x: S_() + 5, y: S_() + 5, w: SAFE_W_() - 10, h: 9, text: c.clubName, fontSize: 7.5, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ffffff" }),
      text({ x: S_() + 5, y: S_() + 15.5, w: SAFE_W_() - 10, h: 6, text: "现在加入，和同好一起搞事情", fontSize: 3.8, fill: "#fff5f9" }),
      text({ x: S_(), y: S_() + 30, w: SAFE_W_(), h: 5, text: "招新时间 · 每周三 19:00 社团活动室", fontSize: 3.6, fill: "#5b5266" }),
      text({ x: S_(), y: S_() + 36, w: SAFE_W_(), h: 5, text: "扫码或加群 · 123456789", fontSize: 3.6, fill: "#5b5266" }),
    ],
  },
  {
    id: "polaroid",
    name: "拍立得",
    desc: "白框照片位，把图拖进去",
    icon: "camera",
    build: () => [
      ...polaroid(S_() + 8, S_() + 2, 52, -4),
      text({ x: S_() + 12, y: S_() + 56, w: 44, h: 7, text: "写点什么", fontSize: 4.2, align: "center", rotation: -4, fill: "#8b8296", fontFamily: fontById("mashan").stack }),
    ],
  },
  {
    id: "title-badge",
    name: "标题徽章",
    desc: "带底色的大标题",
    icon: "tag",
    build: () => [
      rect({ x: S_(), y: S_(), w: 56, h: 13, rotation: -3, radius: 6.5, fill: { type: "solid", color: "#ff5c91" } }),
      text({ x: S_(), y: S_() + 3.4, w: 56, h: 8, text: "标题写这里", fontSize: 6, align: "center", rotation: -3, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ffffff" }),
      vec("sparkle", { x: S_() + 52, y: S_() - 4, w: 10, h: 10, color: "#ffc93c" }),
    ],
  },
  {
    id: "qr-slot",
    name: "二维码位",
    desc: "留个方框，把群码截图放进来",
    icon: "square",
    build: () => [
      rect({ x: S_(), y: S_(), w: 32, h: 32, radius: 3, strokeWidth: 0.6, stroke: "#ffcfe1", dash: true, fill: { type: "solid", color: "#ffffff" } }),
      slot({ x: S_() + 2, y: S_() + 2, w: 28, h: 28, frame: "rect" }),
      text({ x: S_(), y: S_() + 33.5, w: 32, h: 5, text: "扫码进群", fontSize: 3, align: "center", fill: "#8b8296" }),
    ],
  },
];

// ---------------------------------------------------------------- 整页模板

export interface PageTemplate {
  id: string;
  name: string;
  desc: string;
  /** 面板里的分组 */
  cat: string;
  side: SideId | "both";
  build: (ctx: TemplateCtx) => SideDoc;
}

const white = (): SideDoc["background"] => ({ type: "solid", color: "#ffffff" });

export const FRONT_TEMPLATES: PageTemplate[] = [
  {
    id: "f-blank", name: "空白", desc: "从零开始", cat: "空白", side: "front",
    build: () => ({ background: white(), pattern: null, elements: [] }),
  },
  {
    id: "f-sign", name: "空白·右下落款", desc: "一整面留白，只在右下角放头像和 QQ", cat: "空白", side: "front",
    build: (c) => ({
      background: white(),
      pattern: null,
      elements: signature(c),
    }),
  },
  {
    id: "f-photo", name: "满版照片", desc: "整面一张图，底部压标题", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      return {
        background: { type: "linear", color: "#ffd7e7", color2: "#d9d0ff", angle: 30 },
        pattern: null,
        elements: [
          slot({ x: 0, y: 0, w: W, h: H, frame: "rect" }),
          rect({ x: 0, y: H - 46, w: W, h: 46, opacity: 0.88, fill: { type: "linear", color: "#00000000", color2: "#1a0a14", angle: 90 } }),
          text({ x: S, y: H - S - 23, w: SAFE_W_(), h: 13, text: "把你最喜欢的图放进来", fontSize: 9, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ffffff" }),
          text({ x: S, y: H - S - 8, w: SAFE_W_(), h: 5, text: "在这里补一句话", fontSize: 3.6, fill: "#ffd9e6", letterSpacing: 0.3 }),
        ],
      };
    },
  },
  {
    id: "f-split", name: "左图右文", desc: "一半图一半字，稳妥好看", cat: "照片", side: "front",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      const x = W * 0.52 + 7;
      const w = W - S - x;
      return {
        background: { type: "solid", color: "#fff5f9" },
        pattern: null,
        elements: [
          slot({ x: 0, y: 0, w: W * 0.52, h: H, frame: "rect" }),
          text({ x, y: S + 8, w, h: 11, text: "本命角色", fontSize: 8, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ec3b76" }),
          vec("underline", { x, y: S + 21, w: 36, h: 6, color: "#ffc93c" }),
          text({ x, y: S + 30, w, h: 34, text: "写一段安利。\n为什么喜欢，从哪一话开始，\n最想让别人看到的是哪一幕。", fontSize: 3.7, lineHeight: 1.7, fill: "#5b5266", fontFamily: fontById("wenkai").stack }),
          text({ x, y: H - S - 6, w, h: 5, text: `by ${c.nickname || c.qq}`, fontSize: 3.2, fill: "#8b8296" }),
        ],
      };
    },
  },
  {
    id: "f-arch", name: "拱门写真", desc: "居中拱形开窗，像展板", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      const w = Math.min(66, W * 0.45);
      const h = Math.min(72, H * 0.7);
      return {
        background: { type: "linear", color: "#ffe6f1", color2: "#e9e3ff", angle: 30 },
        pattern: null,
        elements: [
          vec("halftone", { x: W - 44, y: -8, w: 52, h: 52, color: "#ffc7de", opacity: 0.65 }),
          vec("halftone", { x: -10, y: H - 40, w: 46, h: 46, color: "#cfc4ff", opacity: 0.5 }),
          rect({ x: (W - w) / 2 - 2.5, y: S - 4.5, w: w + 5, h: h + 5, radius: (w + 5) / 2, fill: { type: "solid", color: "#ffffff" }, opacity: 0.75 }),
          slot({ x: (W - w) / 2, y: S - 2, w, h, frame: "arch" }),
          text({ x: S, y: S + h + 4, w: SAFE_W_(), h: 9, text: "标题写这里", fontSize: 7, align: "center", fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#c72a5e" }),
          text({ x: S, y: S + h + 14, w: SAFE_W_(), h: 5, text: "一句话说明这是什么", fontSize: 3.5, align: "center", fill: "#8b8296", letterSpacing: 0.4 }),
        ],
      };
    },
  },
  {
    id: "f-circle", name: "圆窗", desc: "圆形开窗 + 白边，干净", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      const d = Math.min(70, H * 0.66);
      const cx = (W - d) / 2;
      return {
        background: { type: "linear", color: "#fff3d9", color2: "#ffe0ec", angle: 25 },
        pattern: null,
        elements: [
          {
            id: id(), type: "shape", shape: "ellipse", x: cx - 4, y: S - 3, w: d + 8, h: d + 8,
            rotation: 0, opacity: 1, radius: 0, strokeWidth: 0, stroke: "transparent",
            fill: { type: "solid", color: "#ffffff" },
          },
          slot({ x: cx, y: S + 1, w: d, h: d, frame: "circle" }),
          vec("twinkle", { x: 4, y: S + 1, w: 26, h: 16, color: "#ffc93c", opacity: 0.95 }),
          vec("bow", { x: W - 30, y: S + d - 8, w: 24, h: 16, color: "#ff8fb1" }),
          text({ x: S, y: S + d + 6, w: SAFE_W_(), h: 9, text: "写个标题", fontSize: 6.5, align: "center", fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ec3b76" }),
          text({ x: S, y: S + d + 16, w: SAFE_W_(), h: 5, text: "副标题 · 一句短短的话", fontSize: 3.4, align: "center", fill: "#8b8296" }),
        ],
      };
    },
  },
  {
    id: "f-polaroid", name: "拍立得拼贴", desc: "两张斜放的照片 + 胶带", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      return {
        background: { type: "solid", color: "#fdf3f7" },
        pattern: null,
        elements: [
          vec("halftone", { x: W - Math.min(52, W * 0.42), y: -6, w: 58, h: 58, color: "#ffcfe1", opacity: 0.7 }),
          // 两张照片按版面比例摆，竖版页也不会挤出纸外
          ...polaroid(W * 0.065, H * 0.075, Math.min(52, W * 0.36), -6),
          ...polaroid(W * 0.5, H * 0.225, Math.min(48, W * 0.33), 5),
          vec("tape-washi", { x: W * 0.14, y: H * 0.04, w: 30, h: 9, color: "#b8e0d2", color2: "#ffffff", rotation: -8 }),
          vec("tape", { x: W * 0.57, y: H * 0.17, w: 28, h: 8, color: "#ffd9e6", rotation: 6 }),
          text({ x: S, y: H - S - 9, w: SAFE_W_(), h: 8, text: "我们的夏天", fontSize: 6, align: "center", fontFamily: fontById("mashan").stack, fill: "#c72a5e" }),
        ],
      };
    },
  },
  {
    id: "f-grid", name: "四宫格", desc: "四张图排排站", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      const gap = 3.5;
      const gw = (SAFE_W_() - gap) / 2;
      const gh = (H - S * 2 - 22 - gap) / 2;
      const cells: AnyElement[] = [];
      for (let i = 0; i < 4; i++) {
        cells.push(slot({
          x: S + (i % 2) * (gw + gap),
          y: S + Math.floor(i / 2) * (gh + gap),
          w: gw, h: gh, frame: "round",
        }));
      }
      return {
        background: { type: "solid", color: "#fffafd" },
        pattern: null,
        elements: [
          ...cells,
          text({ x: S, y: H - S - 16, w: SAFE_W_(), h: 8, text: "四张图讲一件事", fontSize: 6, align: "center", fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ec3b76" }),
          text({ x: S, y: H - S - 6, w: SAFE_W_(), h: 5, text: "上面双击任意一格放图", fontSize: 3.2, align: "center", fill: "#b3a8bd" }),
        ],
      };
    },
  },
  {
    id: "f-stamp", name: "邮票三连", desc: "三张齿边小票，像集邮册", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      const d = Math.min(40, (SAFE_W_() - 16) / 3);
      const gap = (SAFE_W_() - d * 3) / 2;
      const items: AnyElement[] = [];
      for (let i = 0; i < 3; i++) {
        items.push(slot({ x: S + i * (d + gap), y: S + 19, w: d, h: d, frame: "stamp" }));
      }
      return {
        background: { type: "linear", color: "#fff8e6", color2: "#ffe7f0", angle: 15 },
        pattern: null,
        elements: [
          text({ x: S, y: S + 2, w: SAFE_W_(), h: 9, text: "S U M M E R   T R I P", fontSize: 5.4, align: "center", letterSpacing: 1.2, fontStyle: "bold", fill: "#c72a5e" }),
          vec("underline", { x: (W - 42) / 2, y: S + 12, w: 42, h: 7, color: "#ffc93c" }),
          ...items,
          text({ x: S, y: S + d + 26, w: SAFE_W_(), h: 7, text: "三格小画", fontSize: 5, align: "center", fontFamily: fontById("mashan").stack, fill: "#5b5266" }),
          text({ x: S, y: S + d + 35, w: SAFE_W_(), h: 5, text: "每张图都能单独换", fontSize: 3.2, align: "center", fill: "#b3a8bd" }),
        ],
      };
    },
  },
  {
    id: "f-heart", name: "心形告白", desc: "心形开窗，本命限定", cat: "照片", side: "front",
    build: () => {
      const W = pw(), H = ph(), S = S_();
      const w = Math.min(74, H * 0.72);
      const h = w / 1.05;
      return {
        background: { type: "linear", color: "#ffd9e6", color2: "#ffb8d4", angle: 30 },
        pattern: null,
        elements: [
          vec("halftone", { x: -12, y: -12, w: 62, h: 62, color: "#ffffff", opacity: 0.35 }),
          vec("halftone", { x: W - 46, y: H - 46, w: 58, h: 58, color: "#ffffff", opacity: 0.3 }),
          slot({ x: (W - w) / 2, y: S - 1, w, h, frame: "heart" }),
          vec("sparkle-trio", { x: W - 44, y: S + 2, w: 34, h: 24, color: "#fff3c9", color2: "#ffffff" }),
          vec("sparkle", { x: 12, y: S + h - 16, w: 14, h: 14, color: "#ffffff", opacity: 0.9 }),
          text({ x: S, y: S + h + 3, w: SAFE_W_(), h: 10, text: "最喜欢你了", fontSize: 7.5, align: "center", fontFamily: fontById("kuaile").stack, fill: "#ffffff" }),
          text({ x: S, y: S + h + 14, w: SAFE_W_(), h: 5, text: "L O V E   Y O U", fontSize: 3.2, align: "center", letterSpacing: 1.4, fill: "#fff0f6" }),
        ],
      };
    },
  },
  {
    id: "f-poster", name: "海报字", desc: "大标题当主角，适合社团口号", cat: "文字", side: "front",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      return {
        background: { type: "linear", color: "#2b2440", color2: "#5b3f7a", angle: 35 },
        pattern: null,
        elements: [
          vec("speedlines", { x: -14, y: -30, w: W + 28, h: W + 28, color: "#ffffff", opacity: 0.13 }),
          vec("twinkle", { x: W - 56, y: 8, w: 48, h: 30, color: "#ffd76e", opacity: 0.9 }),
          text({ x: S, y: H * 0.28, w: SAFE_W_(), h: 22, text: c.clubName, fontSize: 15, align: "center", fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ffffff", shadow: true, shadowColor: "#ff5c91" }),
          text({ x: S, y: H * 0.53, w: SAFE_W_(), h: 8, text: "N E W   M E M B E R   W A N T E D", fontSize: 3.6, align: "center", letterSpacing: 0.6, fill: "#ffc93c" }),
          text({ x: S, y: H - S - 6, w: SAFE_W_(), h: 5, text: "扫码进群 · 一起画画一起看番", fontSize: 3.4, align: "center", fill: "#ddd5ff" }),
        ],
      };
    },
  },
  {
    id: "f-banner", name: "横幅公告", desc: "丝带标题 + 正文，活动通知用", cat: "文字", side: "front",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      const rw = Math.min(120, SAFE_W_() - 10);
      return {
        background: { type: "linear", color: "#fff5f9", color2: "#ffe9f2", angle: 20 },
        pattern: null,
        elements: [
          vec("corner", { x: 1, y: 1, w: 24, h: 24, color: "#ffcfe1" }),
          vec("corner", { x: W - 25, y: H - 25, w: 24, h: 24, color: "#ffcfe1", rotation: 180 }),
          vec("ribbon", { x: (W - rw) / 2, y: S + 2, w: rw, h: rw / 2.6, color: "#ff7fa8" }),
          text({ x: S, y: S + 12, w: SAFE_W_(), h: 12, text: "招新啦", fontSize: 9, align: "center", fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#ffffff" }),
          text({ x: S, y: H * 0.52, w: SAFE_W_(), h: 7, text: c.clubName, fontSize: 5.2, align: "center", fontStyle: "bold", fill: "#c72a5e" }),
          text({ x: S, y: H * 0.62, w: SAFE_W_(), h: 14, text: "时间 · 每周三 19:00\n地点 · 社团活动室 305", fontSize: 3.8, align: "center", lineHeight: 1.8, fill: "#5b5266", fontFamily: fontById("wenkai").stack }),
          text({ x: S, y: H - S - 6, w: SAFE_W_(), h: 5, text: "带上你的本子和热情就够了", fontSize: 3.2, align: "center", fill: "#b3a8bd" }),
        ],
      };
    },
  },
  {
    id: "f-badge", name: "社团名片", desc: "头像 + 昵称 + 社团，自我介绍面", cat: "文字", side: "front",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      const d = 36;
      return {
        background: { type: "solid", color: "#ffffff" },
        pattern: null,
        elements: [
          vec("blob", { x: -18, y: -20, w: 78, h: 78, color: "#ffd9e6", opacity: 0.9 }),
          vec("blob", { x: W - 44, y: H - 42, w: 62, h: 62, color: "#ddd5ff", opacity: 0.8 }),
          avatarSlot(c, { x: S + 6, y: (H - d) / 2 - 6, w: d, h: d }),
          text({ x: S + 50, y: (H - d) / 2 - 4, w: SAFE_W_() - 50, h: 11, text: c.nickname || "我的昵称", fontSize: 8, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#372f42" }),
          text({ x: S + 50, y: (H - d) / 2 + 9, w: SAFE_W_() - 50, h: 6, text: `QQ ${c.qq}`, fontSize: 3.6, fill: "#8b8296", letterSpacing: 0.4 }),
          rect({ x: S + 50, y: (H - d) / 2 + 17, w: 44, h: 0.6, fill: { type: "solid", color: "#ffcfe1" } }),
          text({ x: S + 50, y: (H - d) / 2 + 21, w: SAFE_W_() - 50, h: 6, text: c.clubName, fontSize: 4.2, fill: "#ec3b76", fontStyle: "bold" }),
          text({ x: S + 50, y: H - S - 5, w: SAFE_W_() - 50, h: 5, text: "很高兴认识你", fontSize: 3.2, fill: "#b3a8bd", fontFamily: fontById("mashan").stack }),
        ],
      };
    },
  },
];

export const BACK_TEMPLATES: PageTemplate[] = [
  {
    id: "b-blank", name: "空白", desc: "只留底纹", cat: "空白", side: "back",
    build: () => ({ background: white(), pattern: { id: "none", color: "#e0447c", accent: "#9aa4b2", opacity: 1 }, elements: [] }),
  },
  {
    id: "b-post", name: "标准明信片", desc: "邮政格 + 左侧留言 + QQ 名片", cat: "留言", side: "back",
    build: (c) => {
      const B = B_();
      // 底纹把版面从中间竖着分成两半：左边留言，右边写地址
      const mid = B + tw_() * 0.5;
      const colW = tw_() * 0.5 - 10;
      return {
        background: white(),
        pattern: { id: "cn-post", color: "#e0447c", accent: "#9aa4b2", opacity: 1 },
        elements: [
          text({ x: B + 6, y: B + 24, w: colW, h: 8, text: "Dear", fontSize: 5, fontFamily: fontById("mashan").stack, fill: "#c72a5e" }),
          text({ x: B + 6, y: B + 33, w: colW, h: 34, text: "在这里写下想说的话……", fontSize: 3.6, lineHeight: 1.8, fill: "#5b5266", fontFamily: fontById("wenkai").stack }),
          // 落款放右下角：地址线到成品 65mm 就结束了，下面这块是空的
          ...signature(c, mid + 3),
        ],
      };
    },
  },
  {
    id: "b-letter", name: "整面信纸", desc: "横线信纸 + 一枚邮票照片", cat: "留言", side: "back",
    build: (c) => {
      const W = pw(), H = ph(), B = B_(), S = S_();
      return {
        background: { type: "solid", color: "#fffdf7" },
        pattern: { id: "letter", color: "#f0c9d9", accent: "#c7d2e0", opacity: 1 },
        elements: [
          text({ x: S, y: B + 4, w: SAFE_W_() - 36, h: 8, text: "To  我的朋友", fontSize: 5, fontFamily: fontById("mashan").stack, fill: "#c72a5e" }),
          slot({ x: W - S - 26, y: S, w: 26, h: 30, frame: "stamp" }),
          text({ x: S, y: H - B - 12, w: SAFE_W_(), h: 6, text: `From ${c.nickname || c.qq}`, fontSize: 3.6, align: "right", fill: "#8b8296", fontFamily: fontById("mashan").stack }),
          vec("sparkle-trio", { x: W - 62, y: H - 30, w: 24, h: 17, color: "#ffd76e", color2: "#ffe9a8", opacity: 0.85 }),
        ],
      };
    },
  },
  {
    id: "b-memo", name: "小图 + 留言", desc: "左边写字，右边三张小圆图", cat: "留言", side: "back",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      const d = 28;
      const col = W - S - d;
      const gap = (H - S * 2 - d * 3) / 2;
      const dots: AnyElement[] = [];
      for (let i = 0; i < 3; i++) {
        dots.push(slot({ x: col, y: S + i * (d + gap), w: d, h: d, frame: "round" }));
      }
      return {
        background: { type: "solid", color: "#fffdf7" },
        pattern: { id: "grid", color: "#f2d6e3", accent: "#dbe3ec", opacity: 0.8 },
        elements: [
          text({ x: S, y: S, w: col - S - 8, h: 8, text: "Dear", fontSize: 5.4, fontFamily: fontById("mashan").stack, fill: "#c72a5e" }),
          text({ x: S, y: S + 11, w: col - S - 8, h: 52, text: "今天想说的话都写在这里。\n右边那三格可以放我们的合照，\n或者你最喜欢的三张图。", fontSize: 3.7, lineHeight: 1.9, fill: "#5b5266", fontFamily: fontById("wenkai").stack }),
          text({ x: S, y: H - S - 6, w: col - S - 8, h: 5, text: `From ${c.nickname || c.qq}`, fontSize: 3.4, fill: "#8b8296", fontFamily: fontById("mashan").stack }),
          ...dots,
        ],
      };
    },
  },
  {
    id: "b-ticket", name: "门票存根", desc: "票根形照片 + 活动信息", cat: "照片", side: "back",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      const tw = Math.min(58, W * 0.4);
      const th = H - S * 2 - 10;
      const rx = S + tw + 10;
      return {
        background: { type: "solid", color: "#fffafd" },
        pattern: { id: "dots", color: "#f4d3e3", accent: "#dbe3ec", opacity: 0.9 },
        elements: [
          slot({ x: S, y: S + 5, w: tw, h: th, frame: "ticket" }),
          rect({ x: rx - 5, y: S + 6, w: 0.5, h: th - 2, radius: 0.25, strokeWidth: 0, fill: { type: "solid", color: "#ffcfe1" } }),
          text({ x: rx, y: S + 6, w: W - S - rx, h: 9, text: "A D M I T   O N E", fontSize: 3.4, letterSpacing: 1.1, fill: "#ec3b76" }),
          text({ x: rx, y: S + 14, w: W - S - rx, h: 11, text: c.clubName, fontSize: 7, fontStyle: "bold", fontFamily: fontById("kuaile").stack, fill: "#372f42" }),
          text({ x: rx, y: S + 28, w: W - S - rx, h: 24, text: "日期 · ____年__月__日\n地点 · ____________\n座位 · 自由入场", fontSize: 3.5, lineHeight: 1.9, fill: "#5b5266" }),
          text({ x: rx, y: H - S - 12, w: W - S - rx, h: 5, text: `持票人 ${c.nickname || c.qq}`, fontSize: 3.2, fill: "#8b8296" }),
          text({ x: rx, y: H - S - 6, w: W - S - rx, h: 5, text: "凭此券入场 · 不可转让", fontSize: 2.8, fill: "#b3a8bd" }),
        ],
      };
    },
  },
  {
    id: "b-club", name: "社团信息面", desc: "招新信息 + 联系方式 + 二维码位", cat: "文字", side: "back",
    build: (c) => {
      const W = pw(), H = ph(), S = S_();
      return {
        background: { type: "solid", color: "#fffafd" },
        pattern: { id: "dots", color: "#f4d3e3", accent: "#dbe3ec", opacity: 1 },
        elements: [
          ...BLOCKS.find((b) => b.id === "club-info")!.build(c),
          rect({ x: W - S - 34, y: H - S - 34, w: 34, h: 34, radius: 3, strokeWidth: 0.6, stroke: "#ffcfe1", dash: true, fill: { type: "solid", color: "#ffffff" } }),
          slot({ x: W - S - 32, y: H - S - 32, w: 30, h: 30, frame: "rect" }),
          text({ x: W - S - 34, y: H - S - 39, w: 34, h: 5, text: "群二维码", fontSize: 2.8, align: "center", fill: "#b3a8bd" }),
        ],
      };
    },
  },
];

export const TEMPLATE_CATS = (list: PageTemplate[]) => [...new Set(list.map((t) => t.cat))];

/**
 * 按某一面的朝向排一套模板。turned 的页面长短边是对调的，
 * 模板里的坐标都是从 pw()/ph() 推出来的，所以直接就撑满了。
 */
export function buildSide(t: PageTemplate, ctx: TemplateCtx, turned = false): SideDoc {
  pageTurned = turned;
  try {
    return { ...t.build(ctx), turned };
  } finally {
    pageTurned = false;
  }
}

/** 元素块同理：插到哪一面就按哪一面的朝向算坐标 */
export function buildBlock(b: BlockDef, ctx: TemplateCtx, turned = false): AnyElement[] {
  pageTurned = turned;
  try {
    return b.build(ctx);
  } finally {
    pageTurned = false;
  }
}

export function buildDoc(
  ctx: TemplateCtx,
  frontId = "f-blank",
  backId = "b-post",
  turned: boolean | { front: boolean; back: boolean } = false,
): DesignDoc {
  const f = FRONT_TEMPLATES.find((t) => t.id === frontId) ?? FRONT_TEMPLATES[0];
  const b = BACK_TEMPLATES.find((t) => t.id === backId) ?? BACK_TEMPLATES[0];
  const t = typeof turned === "boolean" ? { front: turned, back: turned } : turned;
  return {
    version: 1 as const,
    spec: { ...SPEC },
    front: buildSide(f, ctx, t.front),
    back: buildSide(b, ctx, t.back),
  };
}
