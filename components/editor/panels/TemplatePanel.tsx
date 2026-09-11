"use client";

import { useMemo, useState } from "react";
import { useEditor, usePageSize } from "../store";
import { MiniPreview } from "../MiniPreview";
import { Icon } from "@/components/ui/icons";
import { TurnSwitch } from "../TurnSwitch";
import { turnLabel } from "@/lib/config";
import { BLOCKS, FRONT_TEMPLATES, BACK_TEMPLATES, TEMPLATE_CATS, buildBlock, buildSide, type TemplateCtx } from "@/lib/templates";

export function TemplatePanel({ ctx, onNew, onGuide }:
  { ctx: TemplateCtx; onNew: () => void; onGuide: () => void }) {
  const side = useEditor((s) => s.side);
  const applySide = useEditor((s) => s.applySide);
  const addElements = useEditor((s) => s.addElements);
  const [cat, setCat] = useState("全部");
  // 模板按当前这一面的朝向排版，竖版页也能撑满
  const { turned } = usePageSize();

  const templates = side === "front" ? FRONT_TEMPLATES : BACK_TEMPLATES;
  const cats = useMemo(() => ["全部", ...TEMPLATE_CATS(templates)], [templates]);
  const shown = useMemo(
    () => templates.filter((t) => cat === "全部" || t.cat === cat),
    [templates, cat],
  );
  // 缩略图里的照片位是虚线形状，正好把「这里能放图」画出来了
  const built = useMemo(
    () => shown.map((t) => ({ t, doc: buildSide(t, ctx, turned) })),
    [shown, ctx, turned],
  );

  return (
    <div className="space-y-5">
      {/* 换一张稿子的入口。顶栏那个「＋」在手机上太小，这里给个说得清楚的 */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onNew} className="btn btn-ghost py-2 text-xs">
          <Icon name="plus" size={14} />
          新建 / 回到之前
        </button>
        <button onClick={onGuide} className="btn btn-ghost py-2 text-xs">
          <Icon name="help" size={14} />
          设计须知
        </button>
      </div>

      {/* 朝向单独一行写清楚：藏在标题旁边的小开关手机上没人找得到 */}
      <div className="border-sakura-100 flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
        <div className="min-w-0">
          <div className="text-ink-800 text-xs font-medium">这一面的朝向</div>
          <div className="text-ink-400 text-[11px] leading-tight">
            正反面可以不一样，现在是{turnLabel(turned)}
          </div>
        </div>
        <TurnSwitch side={side} />
      </div>

      <section>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-ink-600 text-xs font-semibold">
            整页模板 · {side === "front" ? "正面" : "反面"}
          </h3>
        </div>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                cat === c ? "bg-sakura-500 text-white" : "bg-sakura-50 text-ink-600 hover:bg-sakura-100"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-ink-400 mb-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed">
          <Icon name="alert" size={13} className="mt-px shrink-0" />
          套用会替换这一面现有的内容。虚线框是照片位，双击就能放图。
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {built.map(({ t, doc }) => (
            <button
              key={t.id}
              onClick={() => applySide(side, buildSide(t, ctx, turned))}
              className="group border-sakura-100 hover:border-sakura-300 rounded-xl border bg-white p-1.5 text-left transition hover:shadow-md"
            >
              <div className="overflow-hidden rounded-md ring-1 ring-black/5">
                <MiniPreview side={doc} width={150} />
              </div>
              <div className="text-ink-800 mt-1.5 px-0.5 text-[11px] font-medium">{t.name}</div>
              <div className="text-ink-400 px-0.5 text-[10px] leading-tight">{t.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-ink-600 mb-2 text-xs font-semibold">元素块</h3>
        <p className="text-ink-400 mb-2.5 text-[11px]">插到当前这一面，不影响已有内容</p>
        <div className="grid gap-2">
          {BLOCKS.map((b) => (
            <button
              key={b.id}
              onClick={() => addElements(buildBlock(b, ctx, turned))}
              className="border-sakura-100 hover:border-sakura-300 hover:bg-sakura-50 flex items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition"
            >
              <span className="bg-sakura-50 text-sakura-600 grid h-8 w-8 shrink-0 place-items-center rounded-lg">
                <Icon name={b.icon} size={17} />
              </span>
              <span className="min-w-0">
                <span className="text-ink-800 block text-xs font-medium">{b.name}</span>
                <span className="text-ink-400 block text-[10px] leading-tight">{b.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
