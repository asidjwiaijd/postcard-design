"use client";

import { useEditor } from "../store";
import { Icon } from "@/components/ui/icons";
import type { AnyElement } from "@/lib/types";

function labelOf(el: AnyElement) {
  switch (el.type) {
    case "text": return el.text.replace(/\s+/g, " ").slice(0, 18) || "空文字";
    case "image": return el.src ? "图片" : "空照片位";
    case "sticker": return "贴纸";
    case "vector": return "装饰";
    default: return "形状";
  }
}
const iconOf = (el: AnyElement) =>
  el.type === "text" ? "type"
  : el.type === "image" ? "image"
  : el.type === "sticker" ? "sparkles"
  : el.type === "vector" ? "wand"
  : "square";

export function LayerPanel() {
  const els = useEditor((s) => s.doc[s.side].elements);
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const reorder = useEditor((s) => s.reorder);
  const remove = useEditor((s) => s.remove);
  const removeMany = useEditor((s) => s.removeMany);
  const update = useEditor((s) => s.update);
  const begin = useEditor((s) => s.begin);
  const end = useEditor((s) => s.end);

  if (!els.length) {
    return <p className="text-ink-400 py-8 text-center text-xs">这一面还是空的</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-ink-400 mb-2 text-[11px]">
        列表从上到下 = 画面从前到后 · 按住 Shift 点可以多选
      </p>
      {[...els].reverse().map((el) => (
        <div
          key={el.id}
          onClick={(e) => select(el.id, e.shiftKey || e.metaKey || e.ctrlKey)}
          className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition ${
            selected.includes(el.id) ? "border-sakura-400 bg-sakura-50" : "border-sakura-100 bg-white hover:border-sakura-200"
          }`}
        >
          <span className="text-ink-400 w-5 shrink-0 text-center">
            <Icon name={iconOf(el)} size={14} className="mx-auto" />
          </span>
          <span className="text-ink-800 min-w-0 flex-1 truncate text-xs">{labelOf(el)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); begin(); update(el.id, { locked: !el.locked }); end(); }}
            className="text-ink-400 hover:text-ink-800 px-0.5"
            title={el.locked ? "解锁" : "锁定"}
          >
            <Icon name={el.locked ? "lock" : "unlock"} size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); reorder(el.id, "up"); }}
            className="text-ink-400 hover:text-ink-800 px-0.5" title="上移一层"
          >
            <Icon name="chevronUp" size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); reorder(el.id, "down"); }}
            className="text-ink-400 hover:text-ink-800 px-0.5" title="下移一层"
          >
            <Icon name="chevronDown" size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); remove(el.id); }}
            className="px-0.5 text-rose-400 hover:text-rose-600" title="删除"
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2">
        <button
          className="btn btn-ghost px-3 py-1.5 text-[11px]"
          onClick={() => {
            if (!confirm("确定清空这一面的所有元素？")) return;
            removeMany(els.map((e) => e.id));
          }}
        >
          <Icon name="trash" size={13} />
          清空这一面
        </button>
        {selected.length > 1 && (
          <span className="text-ink-400 text-[11px]">已选 {selected.length} 个</span>
        )}
      </div>
    </div>
  );
}
