"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  AnyElement,
  DesignDoc,
  Fill,
  PatternConfig,
  SideDoc,
  SideId,
} from "@/lib/types";
import { pageW, pageH } from "@/lib/config";

const MAX_HISTORY = 60;

interface EditorState {
  doc: DesignDoc;
  side: SideId;
  /** 选中的元素 id。框选和 Shift 点选会有多个，顺序无意义 */
  selected: string[];
  /** 画布缩放，px per mm */
  scale: number;
  /** 视口平移，px */
  pan: { x: number; y: number };
  showGuides: boolean;
  /** 变换手柄是否锁长宽比。只是个工具开关，不进稿子 */
  ratioLock: boolean;
  dirty: boolean;

  past: DesignDoc[];
  future: DesignDoc[];
  /** 一次连续操作（拖拽/滑杆）开始前的快照 */
  pending: DesignDoc | null;

  setDoc: (doc: DesignDoc, resetHistory?: boolean) => void;
  setSide: (s: SideId) => void;
  /** additive=true 时切换该元素的选中状态（Shift 点选） */
  select: (id: string | null, additive?: boolean) => void;
  setSelection: (ids: string[]) => void;
  setView: (v: { scale?: number; pan?: { x: number; y: number } }) => void;
  toggleGuides: () => void;
  toggleRatioLock: () => void;
  markSaved: () => void;

  begin: () => void;
  end: () => void;
  undo: () => void;
  redo: () => void;

  addElements: (els: AnyElement[], select?: boolean) => void;
  update: (id: string, patch: Partial<AnyElement>) => void;
  remove: (id: string) => void;
  removeMany: (ids: string[]) => void;
  duplicate: (id: string) => void;
  duplicateMany: (ids: string[]) => void;
  /** 批量微调：给每个元素同一个增量，撤销时算一步 */
  nudge: (ids: string[], dx: number, dy: number) => void;
  /** 绕各自中心转 deg 度，中心不动 */
  rotateBy: (ids: string[], deg: number) => void;
  /** 把一张图撑满整页（含出血），并压到最底下当背景 */
  fillPage: (id: string) => void;
  /** 直接铺一张整页背景图。最底下已经铺着一张就换掉它，不往下堆 */
  addFullPage: (assetId: string, src: string) => void;
  reorder: (id: string, dir: "front" | "back" | "up" | "down") => void;
  setBackground: (fill: Fill) => void;
  /** 换这一面的朝向。rotateContent=true 时内容跟着转 90°，再换回来正好复原 */
  setTurned: (side: SideId, turned: boolean, rotateContent?: boolean) => void;
  /** 把已经排好的内容补转 90°，对上刚换过的页面朝向 */
  turnContent: (side: SideId, toTurned: boolean) => void;
  setPattern: (p: PatternConfig | null) => void;
  applySide: (side: SideId, doc: SideDoc) => void;
}

const cloneDoc = (d: DesignDoc): DesignDoc => structuredClone(d);

function withSide(doc: DesignDoc, side: SideId, fn: (s: SideDoc) => SideDoc): DesignDoc {
  return { ...doc, [side]: fn(doc[side]) };
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: null as unknown as DesignDoc,
  side: "front",
  selected: [],
  scale: 2,
  pan: { x: 0, y: 0 },
  showGuides: true,
  ratioLock: false,
  dirty: false,
  past: [],
  future: [],
  pending: null,

  setDoc: (doc, resetHistory = true) =>
    set(resetHistory
      ? { doc, past: [], future: [], pending: null, selected: [], dirty: false }
      : { doc, dirty: true }),

  setSide: (side) => set({ side, selected: [] }),
  select: (id, additive = false) => {
    if (!id) return set({ selected: [] });
    if (!additive) return set({ selected: [id] });
    const cur = get().selected;
    set({ selected: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  },
  setSelection: (ids) => set({ selected: ids }),
  setView: (v) => set((s) => ({ scale: v.scale ?? s.scale, pan: v.pan ?? s.pan })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleRatioLock: () => set((s) => ({ ratioLock: !s.ratioLock })),
  markSaved: () => set({ dirty: false }),

  begin: () => {
    if (!get().pending) set({ pending: cloneDoc(get().doc) });
  },
  end: () => {
    const { pending, doc, past } = get();
    if (!pending) return;
    if (JSON.stringify(pending) === JSON.stringify(doc)) {
      set({ pending: null });
      return;
    }
    set({
      past: [...past, pending].slice(-MAX_HISTORY),
      future: [],
      pending: null,
      dirty: true,
    });
  },

  undo: () => {
    const { past, future, doc } = get();
    if (!past.length) return;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future].slice(0, MAX_HISTORY),
      selected: [],
      dirty: true,
    });
  },
  redo: () => {
    const { past, future, doc } = get();
    if (!future.length) return;
    set({
      doc: future[0],
      future: future.slice(1),
      past: [...past, doc].slice(-MAX_HISTORY),
      selected: [],
      dirty: true,
    });
  },

  addElements: (els, doSelect = true) => {
    get().begin();
    const { doc, side } = get();
    set({
      doc: withSide(doc, side, (s) => ({ ...s, elements: [...s.elements, ...els] })),
      selected: doSelect && els.length ? [els[els.length - 1].id] : get().selected,
    });
    get().end();
  },

  update: (id, patch) => {
    const { doc, side } = get();
    set({
      doc: withSide(doc, side, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id ? ({ ...e, ...patch } as AnyElement) : e,
        ),
      })),
      dirty: true,
    });
  },

  remove: (id) => get().removeMany([id]),

  removeMany: (ids) => {
    if (!ids.length) return;
    get().begin();
    const { doc, side } = get();
    const kill = new Set(ids);
    set({
      doc: withSide(doc, side, (s) => ({
        ...s,
        elements: s.elements.filter((e) => !kill.has(e.id)),
      })),
      selected: [],
    });
    get().end();
  },

  duplicate: (id) => get().duplicateMany([id]),

  duplicateMany: (ids) => {
    if (!ids.length) return;
    get().begin();
    const { doc, side } = get();
    const copies = doc[side].elements
      .filter((e) => ids.includes(e.id))
      .map((src) => ({ ...structuredClone(src), id: nanoid(10), x: src.x + 4, y: src.y + 4 }));
    if (!copies.length) return;
    set({
      doc: withSide(doc, side, (s) => ({ ...s, elements: [...s.elements, ...copies] })),
      selected: copies.map((c) => c.id),
    });
    get().end();
  },

  nudge: (ids, dx, dy) => {
    if (!ids.length) return;
    const move = new Set(ids);
    const { doc, side } = get();
    set({
      doc: withSide(doc, side, (s) => ({
        ...s,
        elements: s.elements.map((e) =>
          move.has(e.id) ? { ...e, x: +(e.x + dx).toFixed(2), y: +(e.y + dy).toFixed(2) } : e,
        ),
      })),
      dirty: true,
    });
  },

  rotateBy: (ids, deg) => {
    if (!ids.length) return;
    get().begin();
    const turn = new Set(ids);
    const { doc, side } = get();
    set({
      doc: withSide(doc, side, (s) => ({
        ...s,
        elements: s.elements.map((e) => (turn.has(e.id) ? rotateAboutCenter(e, deg) : e)),
      })),
    });
    get().end();
  },

  fillPage: (id) => {
    const { doc, side } = get();
    const el = doc[side].elements.find((e) => e.id === id);
    if (!el) return;
    get().begin();
    set({
      doc: withSide(doc, side, (s) => ({
        ...s,
        // 铺满整页的图必然挡住其它所有东西，只能当背景，所以顺手压到最底下
        elements: [fullPageOf(el, !!s.turned), ...s.elements.filter((e) => e.id !== id)],
      })),
      selected: [id],
    });
    get().end();
  },

  addFullPage: (assetId, src) => {
    const { doc, side } = get();
    const turned = !!doc[side].turned;
    const bottom = doc[side].elements[0];
    // 连点几张图不该在纸底下堆一摞永远看不见的，换掉当前那张就行
    const reuse = bottom && bottom.type === "image" && isFullPage(bottom, turned) ? bottom : null;
    get().begin();
    set({
      doc: withSide(doc, side, (s) =>
        reuse
          ? { ...s, elements: s.elements.map((e) => (e.id === reuse.id ? { ...e, assetId, src } : e)) }
          : { ...s, elements: [makeFullPageImage(assetId, src, turned), ...s.elements] },
      ),
    });
    const added = get().doc[side].elements[0];
    set({ selected: [added.id] });
    get().end();
  },

  reorder: (id, dir) => {
    get().begin();
    const { doc, side } = get();
    set({
      doc: withSide(doc, side, (s) => {
        const els = [...s.elements];
        const i = els.findIndex((e) => e.id === id);
        if (i < 0) return s;
        const [el] = els.splice(i, 1);
        const to =
          dir === "front" ? els.length
          : dir === "back" ? 0
          : dir === "up" ? Math.min(els.length, i + 1)
          : Math.max(0, i - 1);
        els.splice(to, 0, el);
        return { ...s, elements: els };
      }),
    });
    get().end();
  },

  setBackground: (background) => {
    const { doc, side } = get();
    set({ doc: withSide(doc, side, (s) => ({ ...s, background })), dirty: true });
  },

  setPattern: (pattern) => {
    get().begin();
    const { doc, side } = get();
    set({ doc: withSide(doc, side, (s) => ({ ...s, pattern })) });
    get().end();
  },

  applySide: (side, sideDoc) => {
    get().begin();
    set({ doc: { ...get().doc, [side]: sideDoc }, selected: [] });
    get().end();
  },

  turnContent: (side, toTurned) => {
    get().begin();
    const { doc } = get();
    set({
      doc: { ...doc, [side]: { ...doc[side], elements: turnElements(doc[side].elements, toTurned) } },
      selected: [],
    });
    get().end();
  },

  setTurned: (side, turned, rotateContent = false) => {
    const { doc } = get();
    const cur = !!doc[side].turned;
    if (cur === turned) return;
    get().begin();
    set({
      doc: {
        ...doc,
        [side]: {
          ...doc[side],
          turned,
          elements: rotateContent ? turnElements(doc[side].elements, turned) : doc[side].elements,
        },
      },
      selected: [],
    });
    get().end();
  },
}));

/**
 * 把一整面的内容跟着页面转 90°。元素是绕自己左上角旋转的，所以
 * 「整页转一下」＝ 左上角坐标按页面转过去 + 自身 rotation 加减 90。
 * 转成竖版按顺时针、转回横版按逆时针，来回一次能原样复原。
 */
function turnElements(els: AnyElement[], toTurned: boolean): AnyElement[] {
  // 转之前那一页的尺寸
  const w = pageW(!toTurned), h = pageH(!toTurned);
  return els.map((e) =>
    toTurned
      ? { ...e, x: h - e.y, y: e.x, rotation: e.rotation + 90 }
      : { ...e, x: e.y, y: w - e.x, rotation: e.rotation - 90 },
  );
}

/**
 * 绕元素自己的中心转 deg 度。元素是绕左上角转的，所以光加 rotation
 * 会把它甩出去一大截——得把左上角也绕中心转过去。
 */
function rotateAboutCenter<T extends AnyElement>(e: T, deg: number): T {
  const th = (e.rotation * Math.PI) / 180;
  const cos = Math.cos(th), sin = Math.sin(th);
  const cx = e.x + (e.w / 2) * cos - (e.h / 2) * sin;
  const cy = e.y + (e.w / 2) * sin + (e.h / 2) * cos;
  const d = (deg * Math.PI) / 180;
  const dx = e.x - cx, dy = e.y - cy;
  let rot = (e.rotation + deg) % 360;
  if (rot > 180) rot -= 360;
  if (rot < -180) rot += 360;
  return {
    ...e,
    x: +(cx + dx * Math.cos(d) - dy * Math.sin(d)).toFixed(2),
    y: +(cy + dx * Math.sin(d) + dy * Math.cos(d)).toFixed(2),
    rotation: +rot.toFixed(2),
  };
}

/** 铺满整页 = 占满出血版。判定留 0.2mm 余量，别跟浮点较真 */
export function isFullPage(e: AnyElement, turned: boolean): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.2;
  return (
    !e.rotation &&
    near(e.x, 0) && near(e.y, 0) &&
    near(e.w, pageW(turned)) && near(e.h, pageH(turned))
  );
}

/**
 * 撑满整页版的同一个元素。图片还要顺手清掉蒙板形状和圆角：
 * 留着的话四角会露出纸的底色，裁切时就是一圈白边，不算铺满。
 */
function fullPageOf(e: AnyElement, turned: boolean): AnyElement {
  const box = { x: 0, y: 0, w: pageW(turned), h: pageH(turned), rotation: 0 };
  return e.type === "image"
    ? { ...e, ...box, frame: undefined, radius: 0, fit: "cover" as const }
    : { ...e, ...box };
}

function makeFullPageImage(assetId: string, src: string, turned: boolean): AnyElement {
  return {
    id: nanoid(10),
    type: "image",
    assetId,
    src,
    fit: "cover",
    x: 0,
    y: 0,
    w: pageW(turned),
    h: pageH(turned),
    rotation: 0,
    opacity: 1,
    radius: 0,
    borderWidth: 0,
    borderColor: "#ffffff",
  };
}

/** 把新元素放到当前视口中心附近，避免插到画布外 */
export function centerRect(w: number, h: number) {
  const t = useEditor.getState().doc?.[useEditor.getState().side]?.turned;
  return { x: (pageW(t) - w) / 2, y: (pageH(t) - h) / 2 };
}

/** 当前这一面的版面尺寸（毫米） */
export const usePageSize = () => {
  const turned = useEditor((s) => !!s.doc?.[s.side]?.turned);
  return { turned, w: pageW(turned), h: pageH(turned) };
};

export const useCurrentSide = () => useEditor((s) => s.doc?.[s.side]);
/** 只有恰好选中一个时才返回元素：属性面板改的是单个元素 */
export const useSelectedEl = () =>
  useEditor((s) =>
    s.selected.length === 1
      ? (s.doc?.[s.side].elements.find((e) => e.id === s.selected[0]) ?? null)
      : null,
  );
