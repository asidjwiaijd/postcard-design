"use client";

import { useMemo } from "react";
import { useEditor, usePageSize } from "./store";
import { ColorInput, Field, IconBtn, SegBar, Slider } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { FrameGrid } from "./FrameGrid";
import { useRasterImage } from "./svgImage";
import { isClipped } from "@/lib/frames";
import { FONTS, fontByStack } from "@/lib/fonts";
import { VECTORS } from "@/lib/vectors";
import type { ImageElement, ShapeElement, TextElement, VectorElement } from "@/lib/types";


export function Inspector({ onActivate }: { onActivate: (id: string) => void }) {
  const selected = useEditor((s) => s.selected);
  // 滑杆的范围要按这一面的版面来：竖版页更高更窄
  const page = usePageSize();
  const el = useEditor((s) =>
    s.selected.length === 1
      ? (s.doc[s.side].elements.find((e) => e.id === s.selected[0]) ?? null)
      : null,
  );
  const update = useEditor((s) => s.update);
  const begin = useEditor((s) => s.begin);
  const end = useEditor((s) => s.end);
  const remove = useEditor((s) => s.remove);
  const duplicate = useEditor((s) => s.duplicate);
  const reorder = useEditor((s) => s.reorder);
  const rotateBy = useEditor((s) => s.rotateBy);
  const ratioLock = useEditor((s) => s.ratioLock);
  const toggleRatioLock = useEditor((s) => s.toggleRatioLock);

  if (selected.length > 1) return <MultiProps ids={selected} />;

  if (!el) {
    return (
      <div className="text-ink-400 px-1 py-8 text-center text-xs leading-relaxed">
        点画布上的任意元素
        <br />
        在这里改它的样式
        <br />
        <span className="text-[11px]">在空白处拖一个框可以一次选多个</span>
      </div>
    );
  }

  const set = (patch: Parameters<typeof update>[1]) => update(el.id, patch);
  const live = (patch: Parameters<typeof update>[1]) => { begin(); set(patch); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <IconBtn title="复制一份" onClick={() => duplicate(el.id)}><Icon name="copy" /></IconBtn>
        <IconBtn title="移到最前" onClick={() => reorder(el.id, "front")}><Icon name="toFront" /></IconBtn>
        <IconBtn title="移到最后" onClick={() => reorder(el.id, "back")}><Icon name="toBack" /></IconBtn>
        {/* 转 90° 是绕元素中心转的，位置不会跑掉 */}
        <IconBtn title="逆时针转 90°" onClick={() => rotateBy([el.id], -90)}><Icon name="rotateCcw" /></IconBtn>
        <IconBtn title="顺时针转 90°" onClick={() => rotateBy([el.id], 90)}><Icon name="rotateCw" /></IconBtn>
        <IconBtn
          title={ratioLock ? "长宽比锁着：拖四个角只能等比缩放" : "锁住长宽比，拖角就不会把图拉变形"}
          active={ratioLock}
          onClick={toggleRatioLock}
        >
          <Icon name="link" />
        </IconBtn>
        <IconBtn
          title={el.locked ? "解锁" : "锁定位置"}
          active={!!el.locked}
          onClick={() => { begin(); set({ locked: !el.locked }); end(); }}
        >
          <Icon name={el.locked ? "lock" : "unlock"} />
        </IconBtn>
        <IconBtn title="删除" danger onClick={() => remove(el.id)}><Icon name="trash" /></IconBtn>
      </div>

      {el.type === "text" && <TextProps el={el} set={set} live={live} end={end} onEditText={onActivate} />}
      {el.type === "image" && <ImageProps el={el} set={set} live={live} end={end} onPick={onActivate} />}
      {el.type === "shape" && <ShapeProps el={el} set={set} live={live} end={end} />}
      {el.type === "vector" && <VectorProps el={el} set={set} live={live} end={end} />}

      <details className="border-sakura-100 rounded-xl border bg-white p-2.5">
        <summary className="text-ink-600 cursor-pointer text-xs font-semibold">位置与大小</summary>
        <div className="mt-3 space-y-3">
          <Field label="旋转">
            <Slider value={el.rotation} min={-180} max={180} onChange={(v) => live({ rotation: v })} onCommit={end} suffix="°" />
          </Field>
          <Field label="透明度">
            <Slider value={el.opacity} min={0.05} max={1} step={0.05} decimals={2} onChange={(v) => live({ opacity: v })} onCommit={end} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X" hint="mm">
              <Slider value={el.x} min={-40} max={page.w} step={0.5} decimals={1} onChange={(v) => live({ x: v })} onCommit={end} />
            </Field>
            <Field label="Y" hint="mm">
              <Slider value={el.y} min={-40} max={page.h} step={0.5} decimals={1} onChange={(v) => live({ y: v })} onCommit={end} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-ghost py-1.5 text-[11px]"
              onClick={() => { begin(); set({ x: (page.w - el.w) / 2 }); end(); }}
            >
              水平居中
            </button>
            <button
              className="btn btn-ghost py-1.5 text-[11px]"
              onClick={() => { begin(); set({ y: (page.h - el.h) / 2 }); end(); }}
            >
              垂直居中
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}

type Setters = {
  set: (p: Record<string, unknown>) => void;
  live: (p: Record<string, unknown>) => void;
  end: () => void;
};

function TextProps({
  el, set, live, end, onEditText,
}: Setters & { el: TextElement; onEditText: (id: string) => void }) {
  const bold = el.fontStyle.includes("bold");
  const italic = el.fontStyle.includes("italic");
  const style = (b: boolean, i: boolean) =>
    [i ? "italic" : "", b ? "bold" : ""].filter(Boolean).join(" ") || "normal";

  return (
    <div className="space-y-3">
      <button onClick={() => onEditText(el.id)} className="btn btn-primary w-full py-2 text-xs">
        <Icon name="pencil" size={14} />
        编辑文字内容
      </button>
      <Field label="字体">
        <select
          className="input py-1.5 text-xs"
          value={fontByStack(el.fontFamily).id}
          onChange={(e) => {
            begin_(); set({ fontFamily: FONTS.find((f) => f.id === e.target.value)!.stack }); end();
          }}
          style={{ fontFamily: el.fontFamily }}
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </Field>
      <Field label="字号" hint="毫米">
        <Slider value={el.fontSize} min={1.5} max={28} step={0.2} decimals={1} onChange={(v) => live({ fontSize: v })} onCommit={end} />
      </Field>
      <Field label="颜色">
        <ColorInput value={el.fill} onChange={(c) => live({ fill: c })} onCommit={end} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="对齐">
          <SegBar
            size="sm"
            value={el.align}
            onChange={(v) => { begin_(); set({ align: v }); end(); }}
            options={[
              { value: "left" as const, label: <Icon name="alignLeft" size={14} className="mx-auto" />, title: "左对齐" },
              { value: "center" as const, label: <Icon name="alignCenter" size={14} className="mx-auto" />, title: "居中" },
              { value: "right" as const, label: <Icon name="alignRight" size={14} className="mx-auto" />, title: "右对齐" },
            ]}
          />
        </Field>
        <Field label="字重">
          <SegBar
            size="sm"
            value={bold ? "bold" : "normal"}
            onChange={(v) => { begin_(); set({ fontStyle: style(v === "bold", italic) }); end(); }}
            options={[
              { value: "normal" as const, label: "常规" },
              { value: "bold" as const, label: "加粗" },
            ]}
          />
        </Field>
      </div>
      <Field label="行距">
        <Slider value={el.lineHeight} min={0.9} max={2.6} step={0.05} decimals={2} onChange={(v) => live({ lineHeight: v })} onCommit={end} />
      </Field>
      <Field label="字距" hint="毫米">
        <Slider value={el.letterSpacing} min={-1} max={4} step={0.1} decimals={1} onChange={(v) => live({ letterSpacing: v })} onCommit={end} />
      </Field>
      <details className="border-sakura-100 rounded-xl border bg-white p-2.5">
        <summary className="text-ink-600 cursor-pointer text-xs font-semibold">描边与阴影</summary>
        <div className="mt-3 space-y-3">
          <Field label="描边粗细" hint="深色背景上很有用">
            <Slider value={el.strokeWidth ?? 0} min={0} max={2} step={0.05} decimals={2} onChange={(v) => live({ strokeWidth: v })} onCommit={end} />
          </Field>
          {(el.strokeWidth ?? 0) > 0 && (
            <Field label="描边颜色">
              <ColorInput value={el.stroke ?? "#ffffff"} onChange={(c) => live({ stroke: c })} onCommit={end} />
            </Field>
          )}
          <label className="text-ink-600 flex items-center gap-2 text-xs">
            <input
              type="checkbox" checked={!!el.shadow}
              onChange={(e) => { begin_(); set({ shadow: e.target.checked }); end(); }}
              className="accent-sakura-500"
            />
            投影
          </label>
          {el.shadow && (
            <Field label="投影颜色">
              <ColorInput value={el.shadowColor ?? "#00000055"} onChange={(c) => live({ shadowColor: c })} onCommit={end} />
            </Field>
          )}
        </div>
      </details>
    </div>
  );
}

function ImageProps({
  el, set, live, end, onPick,
}: Setters & { el: ImageElement; onPick: (id: string) => void }) {
  const clipped = isClipped(el.frame);
  const page = usePageSize();
  // 原图的长宽比：拿已经解码好的那张图量，不用再额外请求一次
  const img = useRasterImage(el.src || undefined);
  const natural =
    img && img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : null;
  const fitted = natural ? Math.abs(el.w / el.h - natural) < 0.004 : false;

  /** 把选框掰回原图比例：面积和中心都保持住，只改长宽，视觉上不会突然蹦一下 */
  function restoreRatio() {
    if (!natural) return;
    let w = Math.sqrt(el.w * el.h * natural);
    let h = w / natural;
    const k = Math.min(1, (page.w - 2) / w, (page.h - 2) / h);
    w = Math.round(w * k * 10) / 10;
    h = Math.round(h * k * 10) / 10;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    begin_();
    set({ w, h, x: Math.round((cx - w / 2) * 10) / 10, y: Math.round((cy - h / 2) * 10) / 10 });
    end();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => onPick(el.id)} className="btn btn-primary flex-1 py-2 text-xs">
          <Icon name="image" size={14} />
          {el.src ? "换一张图" : "选图放进来"}
        </button>
        {el.src && (
          <IconBtn
            title="清空成空位"
            onClick={() => { begin_(); set({ src: "", assetId: "" }); end(); }}
          >
            <Icon name="close" />
          </IconBtn>
        )}
      </div>

      {el.src && (
        <button
          onClick={restoreRatio}
          disabled={!natural || fitted}
          className="btn btn-ghost w-full py-2 text-xs"
          title={
            natural
              ? "把选框掰回图片本来的长宽比，裁掉的部分就回来了"
              : "图还没加载好"
          }
        >
          <Icon name="crop" size={14} />
          {fitted ? "已经是原图比例" : "还原原图比例"}
          {natural && !fitted && (
            <span className="text-ink-400 ml-1 font-mono text-[10px]">
              {img!.naturalWidth}×{img!.naturalHeight}
            </span>
          )}
        </button>
      )}

      <Field label="蒙板形状" hint="图会按形状裁好">
        <FrameGrid value={el.frame} onPick={(id) => { begin_(); set({ frame: id }); end(); }} />
      </Field>

      {!clipped && <Field label="填充方式">
        <SegBar
          value={el.fit}
          onChange={(v) => { begin_(); set({ fit: v }); end(); }}
          options={[
            { value: "cover" as const, label: "填满裁切" },
            { value: "contain" as const, label: "完整放入" },
          ]}
        />
      </Field>}
      {(clipped || el.fit === "cover") && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="左右位移">
            <Slider value={el.offsetX ?? 0} min={-0.5} max={0.5} step={0.02} decimals={2} onChange={(v) => live({ offsetX: v })} onCommit={end} />
          </Field>
          <Field label="上下位移">
            <Slider value={el.offsetY ?? 0} min={-0.5} max={0.5} step={0.02} decimals={2} onChange={(v) => live({ offsetY: v })} onCommit={end} />
          </Field>
        </div>
      )}
      {!clipped && (
        <Field label="圆角" hint="毫米">
          <Slider value={el.radius} min={0} max={Math.min(el.w, el.h) / 2} step={0.5} decimals={1} onChange={(v) => live({ radius: v })} onCommit={end} />
        </Field>
      )}
      <Field label="描边粗细" hint="毫米">
        {/* 描边是真毫米：0.3 已经是清清楚楚一圈了，上限给到 2 足够 */}
        <Slider value={el.borderWidth} min={0} max={2} step={0.05} decimals={2} onChange={(v) => live({ borderWidth: v })} onCommit={end} />
      </Field>
      {el.borderWidth > 0 && (
        <Field label="描边颜色">
          <ColorInput value={el.borderColor} onChange={(c) => live({ borderColor: c })} onCommit={end} />
        </Field>
      )}
      <label className="text-ink-600 flex items-center gap-2 text-xs">
        <input
          type="checkbox" checked={!!el.flipX}
          onChange={(e) => { begin_(); set({ flipX: e.target.checked }); end(); }}
          className="accent-sakura-500"
        />
        左右翻转
      </label>
    </div>
  );
}

function ShapeProps({ el, set, live, end }: Setters & { el: ShapeElement }) {
  return (
    <div className="space-y-3">
      <Field label="填充类型">
        <SegBar
          value={el.fill.type}
          onChange={(t) => {
            begin_();
            set({ fill: { ...el.fill, type: t, color2: el.fill.color2 ?? "#b9a7ff", angle: el.fill.angle ?? 35 } });
            end();
          }}
          options={[{ value: "solid" as const, label: "纯色" }, { value: "linear" as const, label: "渐变" }]}
        />
      </Field>
      <Field label="填充色">
        <ColorInput allowTransparent value={el.fill.color} onChange={(c) => live({ fill: { ...el.fill, color: c } })} onCommit={end} />
      </Field>
      {el.fill.type === "linear" && (
        <>
          <Field label="渐变终点">
            <ColorInput value={el.fill.color2 ?? "#b9a7ff"} onChange={(c) => live({ fill: { ...el.fill, color2: c } })} onCommit={end} />
          </Field>
          <Field label="渐变角度">
            <Slider value={el.fill.angle ?? 35} min={0} max={360} onChange={(v) => live({ fill: { ...el.fill, angle: v } })} onCommit={end} suffix="°" />
          </Field>
        </>
      )}
      {el.shape === "rect" && (
        <Field label="圆角" hint="毫米">
          <Slider value={el.radius} min={0} max={Math.min(el.w, el.h) / 2} step={0.5} decimals={1} onChange={(v) => live({ radius: v })} onCommit={end} />
        </Field>
      )}
      <Field label="描边粗细">
        <Slider value={el.strokeWidth} min={0} max={4} step={0.1} decimals={1} onChange={(v) => live({ strokeWidth: v })} onCommit={end} />
      </Field>
      {el.strokeWidth > 0 && (
        <>
          <Field label="描边颜色">
            <ColorInput value={el.stroke} onChange={(c) => live({ stroke: c })} onCommit={end} />
          </Field>
          <label className="text-ink-600 flex items-center gap-2 text-xs">
            <input
              type="checkbox" checked={!!el.dash}
              onChange={(e) => { begin_(); set({ dash: e.target.checked }); end(); }}
              className="accent-sakura-500"
            />
            虚线
          </label>
        </>
      )}
    </div>
  );
}

function VectorProps({ el, live, end }: Setters & { el: VectorElement }) {
  const def = VECTORS.find((v) => v.id === el.vectorId);
  return (
    <div className="space-y-3">
      <p className="text-ink-400 text-[11px]">{def?.name}</p>
      <Field label="主色">
        <ColorInput value={el.color} onChange={(c) => live({ color: c })} onCommit={end} />
      </Field>
      {def?.color2 !== undefined && (
        <Field label="辅色">
          <ColorInput value={el.color2 ?? def.color2!} onChange={(c) => live({ color2: c })} onCommit={end} />
        </Field>
      )}
    </div>
  );
}

/** 多选时只给批量操作：逐个属性一起改容易误伤 */
function MultiProps({ ids }: { ids: string[] }) {
  // 选择器里不能 filter：每次都返回新数组，useSyncExternalStore 会判定快照一直在变
  const all = useEditor((s) => s.doc[s.side].elements);
  const els = useMemo(() => all.filter((e) => ids.includes(e.id)), [all, ids]);
  if (!els.length) return null;

  const box = {
    l: Math.min(...els.map((e) => e.x)),
    r: Math.max(...els.map((e) => e.x + e.w)),
    t: Math.min(...els.map((e) => e.y)),
    b: Math.max(...els.map((e) => e.y + e.h)),
  };
  const align = (fn: (e: (typeof els)[number]) => { x?: number; y?: number }) => {
    const st = useEditor.getState();
    st.begin();
    for (const e of els) st.update(e.id, fn(e));
    st.end();
  };

  const rows: { label: string; icon: string; run: () => void }[] = [
    { label: "左对齐", icon: "alignLeft", run: () => align(() => ({ x: box.l })) },
    { label: "水平居中", icon: "alignCenter", run: () => align((e) => ({ x: (box.l + box.r - e.w) / 2 })) },
    { label: "右对齐", icon: "alignRight", run: () => align((e) => ({ x: box.r - e.w })) },
    { label: "顶对齐", icon: "up", run: () => align(() => ({ y: box.t })) },
    { label: "垂直居中", icon: "minus", run: () => align((e) => ({ y: (box.t + box.b - e.h) / 2 })) },
    { label: "底对齐", icon: "down", run: () => align((e) => ({ y: box.b - e.h })) },
  ];

  return (
    <div className="space-y-3">
      <p className="text-ink-600 text-xs font-semibold">已选中 {els.length} 个元素</p>
      <div className="flex flex-wrap gap-1.5">
        <IconBtn title="复制一份" onClick={() => useEditor.getState().duplicateMany(ids)}>
          <Icon name="copy" />
        </IconBtn>
        <IconBtn title="逆时针各转 90°" onClick={() => useEditor.getState().rotateBy(ids, -90)}>
          <Icon name="rotateCcw" />
        </IconBtn>
        <IconBtn title="顺时针各转 90°" onClick={() => useEditor.getState().rotateBy(ids, 90)}>
          <Icon name="rotateCw" />
        </IconBtn>
        <IconBtn title="全部锁定" onClick={() => {
          const st = useEditor.getState();
          st.begin();
          for (const e of els) st.update(e.id, { locked: true });
          st.end();
        }}>
          <Icon name="lock" />
        </IconBtn>
        <IconBtn title="全部解锁" onClick={() => {
          const st = useEditor.getState();
          st.begin();
          for (const e of els) st.update(e.id, { locked: false });
          st.end();
        }}>
          <Icon name="unlock" />
        </IconBtn>
        <IconBtn title="删除选中的" danger onClick={() => useEditor.getState().removeMany(ids)}>
          <Icon name="trash" />
        </IconBtn>
      </div>
      <Field label="对齐" hint="按选区的外框">
        <div className="grid grid-cols-3 gap-1.5">
          {rows.map((r) => (
            <button
              key={r.label}
              onClick={r.run}
              className="border-sakura-100 hover:border-sakura-300 hover:bg-sakura-50 text-ink-600 flex flex-col items-center gap-0.5 rounded-lg border bg-white py-1.5 text-[10px] transition"
            >
              <Icon name={r.icon} size={14} />
              {r.label}
            </button>
          ))}
        </div>
      </Field>
      <p className="text-ink-400 text-[11px] leading-relaxed">
        拖动选框里的任意位置可以整组移动；电脑上还能用方向键微调、Delete 一次全删。
      </p>
    </div>
  );
}

/** 这些小组件在事件里要开启历史记录，直接取 store 即可 */
function begin_() {
  useEditor.getState().begin();
}
