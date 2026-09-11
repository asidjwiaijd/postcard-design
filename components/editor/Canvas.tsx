"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Stage, Layer, Rect, Line, Group, Image as KImage, Transformer } from "react-konva";
import Konva from "konva";
import type { AnyElement, SideDoc, TextElement } from "@/lib/types";
import { SPEC, pageW, pageH, trimW, trimH } from "@/lib/config";
import { ElementNode, fillProps } from "./nodes";
import { usePatternImage } from "./svgImage";

/**
 * 手机屏幕的 devicePixelRatio 常见是 3，画布按 3 倍分辨率重画，
 * 拖动时每帧要填三倍多的像素，中端机上一眼能看出来卡。封到 2 倍
 * 肉眼几乎分不出，拖动却顺很多。导出走 export.ts，自己带 pixelRatio，
 * 不受这里影响。
 */
if (typeof window !== "undefined") {
  const dpr = window.devicePixelRatio || 1;
  if (window.matchMedia?.("(pointer: coarse)").matches && dpr > 2) Konva.pixelRatio = 2;
}

export interface StageHandle {
  stage: Konva.Stage | null;
  content: Konva.Layer | null;
}

interface Props {
  sideDoc: SideDoc;
  scale: number;
  selected: string[];
  interactive: boolean;
  showGuides: boolean;
  /** 拉手柄时锁住长宽比 */
  lockRatio: boolean;
  onSelect: (id: string | null, additive?: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onChangeStart: () => void;
  onChangeEnd: () => void;
  onPatch: (id: string, patch: Partial<AnyElement>) => void;
  /** 双击元素：文字进原地编辑，空照片位直接弹选图 */
  onActivate: (id: string) => void;
}

/** 吸附阈值（毫米） */
const SNAP = 1.2;
/** 拖出这么多屏幕像素才算框选，低于它就是一次普通的空白点击 */
const MARQUEE_MIN = 4;

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const TEXT_ANCHORS = ["middle-left", "middle-right", ...CORNERS];

function PatternLayer({ sideDoc }: { sideDoc: SideDoc }) {
  const p = sideDoc.pattern;
  const turned = !!sideDoc.turned;
  const img = usePatternImage(p?.id, p?.color ?? "#000", p?.accent ?? "#999", p?.opacity ?? 1, turned);
  if (!img) return null;
  return <KImage image={img} width={pageW(turned)} height={pageH(turned)} listening={false} />;
}

/** 触屏和鼠标要的手柄大小不一样：鼠标能精准点，但手柄太小看不见 */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

export const SideCanvas = forwardRef<StageHandle, Props>(function SideCanvas(
  {
    sideDoc, scale, selected, interactive, showGuides, lockRatio,
    onSelect, onSelectMany, onChangeStart, onChangeEnd, onPatch, onActivate,
  },
  ref,
) {
  const stageRef = useRef<Konva.Stage>(null);
  const contentRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const guideRef = useRef<Konva.Layer>(null);
  const snapRef = useRef<Konva.Layer>(null);
  const snapV = useRef<Konva.Line>(null);
  const snapH = useRef<Konva.Line>(null);
  const mqRef = useRef<Konva.Rect>(null);
  const coarse = useCoarsePointer();
  /** 双指手势中断了一次拖动：松手时要把元素放回原位，别把手势里的位移当成挪动 */
  const dropDrag = useRef(false);

  // 这一面自己的版面：竖版页长短边是对调的
  const turned = !!sideDoc.turned;
  const PW = pageW(turned);
  const PH = pageH(turned);

  useImperativeHandle(ref, () => ({
    get stage() { return stageRef.current; },
    get content() { return contentRef.current; },
  }), []);

  // 选中变化时把变换手柄挂到对应的一个或多个节点上
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selected
      .map((id) => stage.findOne<Konva.Group>(`#${id}`))
      .filter((n): n is Konva.Group => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selected, sideDoc.elements.length, scale]);

  const els = sideDoc.elements;
  const one = selected.length === 1 ? els.find((e) => e.id === selected[0]) : undefined;
  const isText = one?.type === "text";
  const allLocked = selected.length > 0 && selected.every((id) => els.find((e) => e.id === id)?.locked);

  // 事件回调里要读的最新值。窗口监听只挂一次，靠这个 ref 拿新数据，
  // 免得每次 scale/选中变化都重挂一遍监听
  const live = useRef({ els, onSelectMany, scale, coarse });
  live.current = { els, onSelectMany, scale, coarse };

  // ---- 吸附辅助线 ----
  // 两条线常驻，只改坐标和显隐。之前是每帧 new Konva.Line + destroy，
  // 手机上拖一下要造几百个节点，明显拖后腿
  const showSnap = (x: number | null, y: number | null) => {
    const v = snapV.current, h = snapH.current;
    if (!v || !h) return;
    if (x === null) v.visible(false);
    else { v.points([x, 0, x, PH]); v.visible(true); }
    if (y === null) h.visible(false);
    else { h.points([0, y, PW, y]); h.visible(true); }
    snapRef.current?.batchDraw();
  };
  const clearSnap = () => showSnap(null, null);

  const B = SPEC.bleedMm;
  const S = B + SPEC.safeMm;
  const targetsX = [PW / 2, B, PW - B, S, PW - S];
  const targetsY = [PH / 2, B, PH - B, S, PH - S];

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const tr = trRef.current;
    // 多选整组拖的时候每个节点都会走到这里，各自吸各自的会把队形拆散
    if (tr && tr.nodes().length > 1) return;

    const node = e.target;
    const box = node.getClientRect({ relativeTo: node.getLayer() ?? undefined });
    const edgesX = [box.x, box.x + box.width / 2, box.x + box.width];
    const edgesY = [box.y, box.y + box.height / 2, box.y + box.height];

    let hitV: number | null = null;
    let hitH: number | null = null;
    for (let i = 0; i < edgesX.length && hitV === null; i++) {
      for (const t of targetsX) {
        if (Math.abs(edgesX[i] - t) < SNAP) {
          node.x(node.x() + (t - edgesX[i]));
          hitV = t;
          break;
        }
      }
    }
    for (let i = 0; i < edgesY.length && hitH === null; i++) {
      for (const t of targetsY) {
        if (Math.abs(edgesY[i] - t) < SNAP) {
          node.y(node.y() + (t - edgesY[i]));
          hitH = t;
          break;
        }
      }
    }
    showSnap(hitV, hitH);
    // 拖动时 Transformer 自己跟着指针走（_proxyDrag），不看节点被吸走了多少，
    // 不补这一下选框就会跟元素错开吸附的那点距离
    if ((hitV !== null || hitH !== null) && tr) tr.forceUpdate();
  };

  const handleDragEnd = (id: string, node: Konva.Node) => {
    clearSnap();
    if (dropDrag.current) {
      const el = els.find((e) => e.id === id);
      if (el) node.position({ x: el.x, y: el.y });
      trRef.current?.forceUpdate();
      onChangeEnd();
      return;
    }
    onPatch(id, { x: +node.x().toFixed(2), y: +node.y().toFixed(2) });
    onChangeEnd();
  };

  /** 多选时整组拖动：位置写回每个节点 */
  const commitPositions = () => {
    const nodes = trRef.current?.nodes() ?? [];
    if (dropDrag.current) {
      for (const n of nodes) {
        const el = els.find((e) => e.id === n.id());
        if (el) n.position({ x: el.x, y: el.y });
      }
      trRef.current?.forceUpdate();
      onChangeEnd();
      return;
    }
    for (const n of nodes) {
      onPatch(n.id(), { x: +n.x().toFixed(2), y: +n.y().toFixed(2) });
    }
    onChangeEnd();
  };

  const handleTransformEnd = () => {
    const nodes = trRef.current?.nodes() ?? [];
    for (const node of nodes) {
      const el = els.find((e) => e.id === node.id());
      if (!el) continue;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      const base = {
        x: +node.x().toFixed(2),
        y: +node.y().toFixed(2),
        rotation: +node.rotation().toFixed(2),
      };

      if (el.type === "text") {
        const t = el as TextElement;
        // 等比拖角 => 连字号一起放大；拖左右中点 => 只改行宽
        const uniform = Math.abs(sx - sy) < 0.02;
        onPatch(el.id, {
          ...base,
          w: Math.max(6, +(t.w * sx).toFixed(2)),
          ...(uniform ? { fontSize: Math.max(1.2, +(t.fontSize * sy).toFixed(2)) } : {}),
        } as Partial<AnyElement>);
      } else {
        onPatch(el.id, {
          ...base,
          w: Math.max(2, +(el.w * sx).toFixed(2)),
          h: Math.max(2, +(el.h * sy).toFixed(2)),
        });
      }
    }
    onChangeEnd();
  };

  // ---- 框选：鼠标和触屏都能拖 ----
  // 选框直接改 Konva 节点，不走 React：以前每帧 setState 会把整棵元素树
  // 重新渲染一遍，元素一多就跟不上手指了
  const dragBox = useRef<{
    x0: number; y0: number; x1: number; y1: number; additive: boolean; base: string[];
  } | null>(null);
  const detach = useRef<(() => void) | null>(null);

  const paintMarquee = () => {
    const b = dragBox.current;
    const r = mqRef.current;
    if (!b || !r) return;
    r.setAttrs({
      x: Math.min(b.x0, b.x1), y: Math.min(b.y0, b.y1),
      width: Math.abs(b.x1 - b.x0), height: Math.abs(b.y1 - b.y0),
      visible: true,
    });
    r.getLayer()?.batchDraw();
  };

  const stopMarquee = () => {
    detach.current?.();
    detach.current = null;
    dragBox.current = null;
    const r = mqRef.current;
    if (r) { r.visible(false); r.getLayer()?.batchDraw(); }
  };

  /**
   * 指针在画布坐标系（毫米）里的位置。自己按容器的位置算，不用
   * stage.getPointerPosition()——手指/鼠标滑出画布之后它就不更新了，
   * 框选拖到边缘外会卡住。容器可能正被双指手势临时 CSS 缩放，所以
   * 用实际 rect 的宽度反推缩放，不能直接除 scale。
   */
  const pointAt = (evt: MouseEvent | TouchEvent) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const t = "touches" in evt ? (evt.touches[0] ?? evt.changedTouches[0]) : evt;
    if (!t) return null;
    const el = stage.container();
    const box = el.getBoundingClientRect();
    const k = (box.width / (el.clientWidth || box.width) || 1) * live.current.scale;
    return { x: (t.clientX - box.left) / k, y: (t.clientY - box.top) / k };
  };

  const finishMarquee = () => {
    const start = dragBox.current;
    stopMarquee();
    const stage = stageRef.current;
    const layer = contentRef.current;
    if (!start || !stage || !layer) return;

    const { els: curEls, onSelectMany: pick, scale: k, coarse: touch } = live.current;
    const { x1, y1 } = start;
    // 手指没有鼠标准，触屏上得多挪几个像素才算框选
    const min = touch ? MARQUEE_MIN * 2.5 : MARQUEE_MIN;
    if (Math.abs(x1 - start.x0) * k < min && Math.abs(y1 - start.y0) * k < min) {
      return; // 没拖动，当作普通点击（取消选中已经在按下时做了）
    }
    const box = {
      l: Math.min(start.x0, x1), r: Math.max(start.x0, x1),
      t: Math.min(start.y0, y1), b: Math.max(start.y0, y1),
    };
    const hit: string[] = [];
    for (const el of curEls) {
      if (el.locked) continue;
      const node = stage.findOne<Konva.Group>(`#${el.id}`);
      if (!node) continue;
      const r = node.getClientRect({ relativeTo: layer });
      // 碰到就算选中，不要求整个框住——小元素本来就难完全套进去
      if (r.x < box.r && r.x + r.width > box.l && r.y < box.b && r.y + r.height > box.t) {
        hit.push(el.id);
      }
    }
    const next = start.additive ? [...new Set([...start.base, ...hit])] : hit;
    pick(next);
  };

  useEffect(() => () => stopMarquee(), []);

  /**
   * 双指一落下就把正在拖的元素放开：这时候用户要的是缩放/平移画布，
   * 不是把元素甩到一边去。松手时 handleDragEnd 会把它放回原位。
   */
  useEffect(() => {
    if (!interactive) return;
    const onStart = (ev: TouchEvent) => {
      if (ev.touches.length < 2 || !Konva.DD.isDragging) return;
      dropDrag.current = true;
      [...Konva.DD._dragElements.values()].forEach((d) => d.node.stopDrag());
      // stopDrag 会同步走完 dragend，标记用完就清掉
      dropDrag.current = false;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    return () => window.removeEventListener("touchstart", onStart);
  }, [interactive]);

  /** 在空白处按下：开始拉框。鼠标和手指走同一套 */
  const beginBoxSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target !== e.target.getStage()) return;
    const evt = e.evt;
    const additive =
      "shiftKey" in evt ? !!(evt.shiftKey || evt.metaKey || evt.ctrlKey) : false;
    const base = selected;
    if (!additive) onSelect(null);
    if (!interactive) return;
    // 双指是缩放手势，不是框选
    if ("touches" in evt && evt.touches.length > 1) return;
    const p = pointAt(evt);
    if (!p) return;
    stopMarquee();
    dragBox.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, additive, base };

    const move = (ev: MouseEvent | TouchEvent) => {
      const b = dragBox.current;
      if (!b) return;
      // 第二根手指落下 = 改成缩放/平移手势，框选作废
      if ("touches" in ev && ev.touches.length > 1) { stopMarquee(); return; }
      const q = pointAt(ev);
      if (!q) return;
      // 手指在画布上划的时候别让页面跟着动
      if ("touches" in ev && ev.cancelable) ev.preventDefault();
      b.x1 = q.x;
      b.y1 = q.y;
      paintMarquee();
    };
    const extra = (ev: TouchEvent) => {
      if (ev.touches.length > 1) stopMarquee();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchstart", extra, { passive: true });
    window.addEventListener("mouseup", finishMarquee);
    window.addEventListener("touchend", finishMarquee);
    window.addEventListener("touchcancel", finishMarquee);
    detach.current = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchstart", extra);
      window.removeEventListener("mouseup", finishMarquee);
      window.removeEventListener("touchend", finishMarquee);
      window.removeEventListener("touchcancel", finishMarquee);
    };
  };

  /** 点已经在多选里的元素时保持整组，方便直接拖走 */
  const handleSelect = (id: string, additive: boolean) => {
    if (additive) return onSelect(id, true);
    if (selected.length > 1 && selected.includes(id)) return;
    onSelect(id);
  };

  const stageW = PW * scale;
  const stageH = PH * scale;

  /**
   * Transformer 自己用绝对坐标定位（见 Konva 源码里 getAbsoluteTransform 的注释），
   * 不吃所在图层的缩放。所以这些尺寸直接写屏幕像素，千万别再除以 scale——
   * 之前除过，手柄只有两三个像素，几乎点不到。
   */
  const anchor = coarse ? 16 : 20;
  const multi = selected.length > 1;

  return (
    <Stage
      ref={stageRef}
      width={stageW}
      height={stageH}
      // touch-action:none 让浏览器把触摸事件留给画布，不然拖框会变成翻页
      style={{ borderRadius: 6, touchAction: "none" }}
      onMouseDown={beginBoxSelect}
      onTouchStart={beginBoxSelect}
    >
      {/* 内容层：导出时只导这一层，天然不含参考线和手柄 */}
      <Layer ref={contentRef} scaleX={scale} scaleY={scale} listening={interactive}>
        <Rect
          width={PW} height={PH} listening={false}
          {...fillProps(sideDoc.background, PW, PH)}
        />
        <PatternLayer sideDoc={sideDoc} />
        <Group onDragMove={handleDragMove}>
          {els.map((e) => (
            <ElementNode
              key={e.id}
              el={e}
              interactive={interactive}
              onSelect={handleSelect}
              onDragStart={onChangeStart}
              onDragEnd={handleDragEnd}
              onDblClick={onActivate}
            />
          ))}
        </Group>
      </Layer>

      {/* 参考线层 */}
      <Layer ref={guideRef} scaleX={scale} scaleY={scale} listening={false} visible={showGuides}>
        <Rect
          x={B} y={B} width={trimW(turned)} height={trimH(turned)}
          stroke="#ff5c91" strokeWidth={0.35} dash={[2, 1.6]} strokeScaleEnabled={false}
        />
        <Rect
          x={S} y={S} width={trimW(turned) - SPEC.safeMm * 2} height={trimH(turned) - SPEC.safeMm * 2}
          stroke="#7c6cf6" strokeWidth={0.25} dash={[1.2, 1.4]} opacity={0.7} strokeScaleEnabled={false}
        />
        {/* 出血区遮罩：提示这一圈会被裁掉 */}
        <Group opacity={0.14} listening={false}>
          <Rect x={0} y={0} width={PW} height={B} fill="#ff5c91" />
          <Rect x={0} y={PH - B} width={PW} height={B} fill="#ff5c91" />
          <Rect x={0} y={B} width={B} height={PH - B * 2} fill="#ff5c91" />
          <Rect x={PW - B} y={B} width={B} height={PH - B * 2} fill="#ff5c91" />
        </Group>
        {/* 裁切角标 */}
        {[[B, B, 1, 1], [PW - B, B, -1, 1], [B, PH - B, 1, -1], [PW - B, PH - B, -1, -1]].map(
          ([x, y, sx, sy], i) => (
            <Group key={i}>
              <Line points={[x - sx * B, y, x - sx * (B + 1.5), y]} stroke="#372f42" strokeWidth={0.25} strokeScaleEnabled={false} />
              <Line points={[x, y - sy * B, x, y - sy * (B + 1.5)]} stroke="#372f42" strokeWidth={0.25} strokeScaleEnabled={false} />
            </Group>
          ),
        )}
      </Layer>

      {/* 吸附线单独一层：拖动时每帧只重画这两条线 */}
      <Layer ref={snapRef} scaleX={scale} scaleY={scale} listening={false}>
        {/* 线宽是屏幕像素（strokeScaleEnabled=false），细于 1 会淡到看不见 */}
        <Line ref={snapV} visible={false} points={[0, 0, 0, PH]} stroke="#7c6cf6" strokeWidth={1.1} dash={[5, 4]} strokeScaleEnabled={false} />
        <Line ref={snapH} visible={false} points={[0, 0, PW, 0]} stroke="#7c6cf6" strokeWidth={1.1} dash={[5, 4]} strokeScaleEnabled={false} />
      </Layer>

      {/* 手柄层 */}
      <Layer scaleX={scale} scaleY={scale}>
        <Transformer
          ref={trRef}
          rotateEnabled={!allLocked}
          resizeEnabled={!allLocked}
          keepRatio={lockRatio}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          rotateAnchorOffset={coarse ? 28 : 34}
          anchorSize={anchor}
          anchorCornerRadius={anchor / 2}
          anchorStroke="#ff3d7f"
          anchorFill="#ffffff"
          anchorStrokeWidth={2.6}
          borderStroke="#ff3d7f"
          borderStrokeWidth={2.2}
          borderDash={[6, 4]}
          padding={coarse ? 3 : 5}
          ignoreStroke
          shouldOverdrawWholeArea={multi}
          anchorStyleFunc={(a) => {
            // 白底粉描边太容易融进浅色画面，加一层投影才看得清
            a.shadowColor("rgba(150,20,70,0.45)");
            a.shadowBlur(6);
            a.shadowOffsetY(1.5);
            if (a.hasName("rotater")) {
              a.fill("#ff3d7f");
              a.stroke("#ffffff");
            }
          }}
          enabledAnchors={
            // 锁了比例就只留四个角：拖中间那几个手柄改的是单边，锁不住
            lockRatio ? CORNERS : isText ? TEXT_ANCHORS : undefined
          }
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 3 * scale || newBox.height < 3 * scale ? oldBox : newBox
          }
          onDragStart={onChangeStart}
          onDragEnd={commitPositions}
          onTransformStart={onChangeStart}
          onTransformEnd={handleTransformEnd}
        />
        <Rect
          ref={mqRef}
          visible={false}
          fill="rgba(255,92,145,0.12)" stroke="#ff3d7f"
          strokeWidth={1.4 / scale} dash={[5 / scale, 3 / scale]} listening={false}
        />
      </Layer>
    </Stage>
  );
});
