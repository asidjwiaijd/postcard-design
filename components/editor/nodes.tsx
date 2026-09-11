"use client";

import { Group, Rect, Ellipse, Line, Star, Path, Text, Image as KImage } from "react-konva";
import type Konva from "konva";
import type {
  AnyElement,
  Fill,
  ImageElement,
  ShapeElement,
  TextElement,
  VectorElement,
  StickerElement,
} from "@/lib/types";
import { useVectorImage, useRasterImage } from "./svgImage";
import { frameById, isClipped } from "@/lib/frames";

/** 把 Fill 转成 Konva 的填充属性 */
export function fillProps(f: Fill, w: number, h: number) {
  if (f.type === "linear") {
    const rad = ((f.angle ?? 0) * Math.PI) / 180;
    const dx = (Math.cos(rad) * w) / 2;
    const dy = (Math.sin(rad) * h) / 2;
    return {
      fillLinearGradientStartPoint: { x: w / 2 - dx, y: h / 2 - dy },
      fillLinearGradientEndPoint: { x: w / 2 + dx, y: h / 2 + dy },
      fillLinearGradientColorStops: [0, f.color, 1, f.color2 ?? f.color],
    };
  }
  return { fill: f.color };
}

/** 100×100 坐标系下的路径，按元素宽高拉伸 */
const PATHS: Record<string, string> = {
  heart:
    "M50 92 C 14 66, 0 44, 0 26 C 0 10, 13 0, 26 0 C 37 0, 46 6, 50 15 C 54 6, 63 0, 74 0 C 87 0, 100 10, 100 26 C 100 44, 86 66, 50 92 Z",
  speech:
    "M8 0 H92 A8 8 0 0 1 100 8 V62 A8 8 0 0 1 92 70 H40 L18 90 L23 70 H8 A8 8 0 0 1 0 62 V8 A8 8 0 0 1 8 0 Z",
};

interface NodeProps {
  el: AnyElement;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: () => void;
  onDragEnd: (id: string, node: Konva.Node) => void;
  onDblClick?: (id: string) => void;
  interactive: boolean;
}

function ShapeBody({ el }: { el: ShapeElement }) {
  const { w, h, shape, stroke, strokeWidth, radius, dash } = el;
  const common = {
    stroke: strokeWidth > 0 ? stroke : undefined,
    strokeWidth,
    dash: dash ? [strokeWidth * 3, strokeWidth * 2.2] : undefined,
    strokeScaleEnabled: false as const,
  };
  const f = fillProps(el.fill, w, h);

  switch (shape) {
    case "ellipse":
      return <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} {...f} {...common} />;
    case "triangle":
      return <Line points={[w / 2, 0, w, h, 0, h]} closed {...f} {...common} />;
    case "star":
      return (
        <Star
          x={w / 2} y={h / 2} numPoints={5}
          innerRadius={Math.min(w, h) / 4.6} outerRadius={Math.min(w, h) / 2}
          {...f} {...common}
        />
      );
    case "line":
      return <Line points={[0, h / 2, w, h / 2]} stroke={el.fill.color} strokeWidth={Math.max(0.2, h)} lineCap="round" dash={dash ? [h * 2.5, h * 2] : undefined} strokeScaleEnabled={false} />;
    case "heart":
    case "speech":
      return <Path data={PATHS[shape]} scaleX={w / 100} scaleY={h / (shape === "heart" ? 92 : 90)} {...f} {...common} />;
    default:
      return <Rect width={w} height={h} cornerRadius={radius} {...f} {...common} />;
  }
}

/** 蒙板路径：单位正方形的 d 按元素宽高做非等比缩放，交给 Konva 去 clip */
function clipToFrame(d: string, w: number, h: number): [Path2D] {
  const p = new Path2D();
  p.addPath(new Path2D(d), new DOMMatrix([w, 0, 0, h, 0, 0]));
  return [p];
}

/** 还没放图的照片位：画出蒙板形状本身，让人一眼看出图会被裁成什么样 */
function EmptySlot({ el }: { el: ImageElement }) {
  const { w, h } = el;
  const fr = frameById(el.frame);
  const arm = Math.min(w, h) * 0.1;
  return (
    <>
      <Path
        data={fr.d} scaleX={w} scaleY={h}
        fill="#fdf6fa" stroke="#eec6de" strokeWidth={1.4} dash={[5, 4]}
        strokeScaleEnabled={false}
      />
      <Line
        points={[w / 2 - arm, h / 2, w / 2 + arm, h / 2]}
        stroke="#e79dc4" strokeWidth={1.6} lineCap="round" strokeScaleEnabled={false} listening={false}
      />
      <Line
        points={[w / 2, h / 2 - arm, w / 2, h / 2 + arm]}
        stroke="#e79dc4" strokeWidth={1.6} lineCap="round" strokeScaleEnabled={false} listening={false}
      />
    </>
  );
}

function ImageBody({ el }: { el: ImageElement | StickerElement }) {
  const img = useRasterImage(el.src);
  const { w, h } = el;
  const isPhoto = el.type === "image";
  const photo = el as ImageElement;
  const radius = isPhoto ? photo.radius : 0;
  const borderWidth = isPhoto ? photo.borderWidth : 0;
  const frameId = isPhoto ? photo.frame : undefined;
  const clipped = isClipped(frameId);
  const fr = frameById(frameId);

  if (isPhoto && !el.src) return <EmptySlot el={photo} />;

  if (!img) {
    return (
      <Rect
        width={w} height={h} cornerRadius={radius}
        fill="#f4eef7" stroke="#e2d5ea" strokeWidth={0.3} dash={[1.4, 1.2]}
        strokeScaleEnabled={false}
      />
    );
  }

  let crop: { x: number; y: number; width: number; height: number } | undefined;
  let drawW = w;
  let drawH = h;
  let dx = 0;
  let dy = 0;

  // 蒙板下一律填满，否则形状里会露出底
  const fit = isPhoto && !clipped ? photo.fit : "cover";
  if (fit === "cover") {
    const ar = w / h;
    const iar = img.naturalWidth / img.naturalHeight;
    let cw: number, ch: number;
    if (iar > ar) {
      ch = img.naturalHeight;
      cw = ch * ar;
    } else {
      cw = img.naturalWidth;
      ch = cw / ar;
    }
    const ox = photo.offsetX ?? 0;
    const oy = photo.offsetY ?? 0;
    crop = {
      x: (img.naturalWidth - cw) * (0.5 + ox),
      y: (img.naturalHeight - ch) * (0.5 + oy),
      width: cw,
      height: ch,
    };
  } else {
    const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    drawW = img.naturalWidth * s;
    drawH = img.naturalHeight * s;
    dx = (w - drawW) / 2;
    dy = (h - drawH) / 2;
  }

  const gray = isPhoto && photo.grayscale;
  const flip = isPhoto && photo.flipX;

  const picture = (
    <KImage
      image={img}
      x={dx + (flip ? drawW : 0)}
      y={dy}
      width={drawW}
      height={drawH}
      scaleX={flip ? -1 : 1}
      crop={crop}
      cornerRadius={clipped ? 0 : radius}
      filters={gray ? [] : undefined}
      opacity={gray ? 0.999 : 1}
    />
  );

  return (
    <>
      {clipped ? (
        <Group clipFunc={() => clipToFrame(fr.d, w, h)}>{picture}</Group>
      ) : (
        picture
      )}
      {borderWidth > 0 &&
        (clipped ? (
          <Path
            data={fr.d} scaleX={w} scaleY={h}
            stroke={photo.borderColor} strokeWidth={borderWidth} listening={false}
          />
        ) : (
          <Rect
            width={w} height={h} cornerRadius={radius}
            stroke={photo.borderColor} strokeWidth={borderWidth} listening={false}
          />
        ))}
    </>
  );
}

function VectorBody({ el }: { el: VectorElement }) {
  const img = useVectorImage(el.vectorId, el.color, el.color2, el.w);
  if (!img) return <Rect width={el.w} height={el.h} fill="rgba(0,0,0,0.001)" />;
  return <KImage image={img} width={el.w} height={el.h} />;
}

function TextBody({ el }: { el: TextElement }) {
  return (
    <Text
      text={el.text}
      width={el.w}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={el.fontStyle}
      fill={el.fill}
      align={el.align}
      lineHeight={el.lineHeight}
      letterSpacing={el.letterSpacing}
      wrap="word"
      stroke={el.strokeWidth ? el.stroke : undefined}
      strokeWidth={el.strokeWidth ?? 0}
      fillAfterStrokeEnabled
      strokeScaleEnabled={false}
      shadowEnabled={!!el.shadow}
      shadowColor={el.shadowColor ?? "#00000055"}
      shadowBlur={el.fontSize * 0.35}
      shadowOffsetY={el.fontSize * 0.12}
    />
  );
}

export function ElementNode({
  el, onSelect, onDragStart, onDragEnd, onDblClick, interactive,
}: NodeProps) {
  const body =
    el.type === "text" ? <TextBody el={el} />
    : el.type === "image" || el.type === "sticker" ? <ImageBody el={el} />
    : el.type === "vector" ? <VectorBody el={el} />
    : <ShapeBody el={el as ShapeElement} />;

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={interactive && !el.locked}
      listening={interactive}
      onMouseDown={(e) => onSelect(el.id, e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)}
      onTouchStart={() => onSelect(el.id, false)}
      onDragStart={onDragStart}
      onDragEnd={(e) => onDragEnd(el.id, e.target)}
      onDblClick={() => onDblClick?.(el.id)}
      onDblTap={() => onDblClick?.(el.id)}
    >
      {body}
    </Group>
  );
}
