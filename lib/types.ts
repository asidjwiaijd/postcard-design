/** 设计文档模型：所有几何量的单位都是毫米，与分辨率无关。 */

export type SideId = "front" | "back";

export interface Fill {
  type: "solid" | "linear";
  color: string;
  /** 渐变第二色 */
  color2?: string;
  /** 渐变角度，度 */
  angle?: number;
}

export interface BaseElement {
  id: string;
  type: string;
  name?: string;
  /** 左上角坐标，以出血版左上角为原点，毫米 */
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontFamily: string;
  /** 字号，毫米（约等于 pt × 0.353） */
  fontSize: number;
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  fontStyle: string; // "normal" | "bold" | "italic" | "italic bold"
  stroke?: string;
  strokeWidth?: number;
  shadow?: boolean;
  shadowColor?: string;
  vertical?: boolean;
}

export interface ImageElement extends BaseElement {
  type: "image";
  /** 空串 = 还没放图的照片位（剪贴蒙板），画布上显示成虚线占位框 */
  assetId: string;
  src: string;
  /** 蒙板形状 id，见 lib/frames.ts。缺省按矩形 + radius 圆角处理 */
  frame?: string;
  /** cover=填满裁切，contain=完整放入 */
  fit: "cover" | "contain";
  /** cover 时图片在框内的平移，-0.5~0.5，相对被裁掉的余量 */
  offsetX?: number;
  offsetY?: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  shadow?: boolean;
  grayscale?: boolean;
  flipX?: boolean;
}

export type ShapeKind =
  | "rect"
  | "ellipse"
  | "triangle"
  | "star"
  | "heart"
  | "line"
  | "speech";

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: Fill;
  stroke: string;
  strokeWidth: number;
  radius: number;
  dash?: boolean;
}

/** 内置矢量装饰：由 lib/stickers.ts 按 id + 颜色生成 SVG */
export interface VectorElement extends BaseElement {
  type: "vector";
  vectorId: string;
  color: string;
  color2?: string;
}

/** 管理员上传的贴纸素材 */
export interface StickerElement extends BaseElement {
  type: "sticker";
  assetId: string;
  src: string;
}

export type AnyElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | VectorElement
  | StickerElement;

export interface PatternConfig {
  id: string;
  color: string;
  accent: string;
  opacity: number;
}

export interface SideDoc {
  /**
   * 这一面转 90° 设计（长短边对调）。正反两面可以各选各的：
   * 一张横版卡的背面照样可以竖着排。见 lib/config.ts 的 pageW/pageH。
   */
  turned?: boolean;
  background: Fill;
  /** 仅背面使用的邮政底纹 */
  pattern?: PatternConfig | null;
  elements: AnyElement[];
}

export interface DesignDoc {
  version: 1;
  spec: {
    widthMm: number;
    heightMm: number;
    bleedMm: number;
    safeMm: number;
    dpi: number;
  };
  front: SideDoc;
  back: SideDoc;
}

export interface SessionUser {
  id: string;
  qq: string;
  nickname: string;
  avatar: string;
  quota: number;
}
