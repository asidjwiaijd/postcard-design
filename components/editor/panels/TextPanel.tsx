"use client";

import { useEditor } from "../store";
import { makeText, TEXT_PRESETS } from "../factories";
import { FONTS } from "@/lib/fonts";

export function TextPanel() {
  const addElements = useEditor((s) => s.addElements);
  const selected = useEditor((s) => s.selected);
  const update = useEditor((s) => s.update);
  const begin = useEditor((s) => s.begin);
  const end = useEditor((s) => s.end);
  const el = useEditor((s) =>
    s.selected.length === 1 ? s.doc[s.side].elements.find((e) => e.id === s.selected[0]) : undefined,
  );
  const isText = el?.type === "text";

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-ink-600 mb-2 text-xs font-semibold">加一段文字</h3>
        <div className="grid gap-2">
          {TEXT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => addElements([makeText(p.id)])}
              className="border-sakura-100 hover:border-sakura-300 hover:bg-sakura-50 flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left transition"
            >
              <span
                className="text-ink-800 truncate"
                style={{
                  fontFamily: FONTS.find((f) => f.id === p.fontId)?.stack,
                  fontSize: Math.min(20, p.fontSize * 2.2),
                  fontWeight: p.bold ? 700 : 400,
                }}
              >
                {p.sample}
              </span>
              <span className="text-ink-400 shrink-0 text-[10px]">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-ink-600 mb-1 text-xs font-semibold">字体</h3>
        <p className="text-ink-400 mb-2 text-[11px]">
          {isText ? "点一下换掉选中文字的字体" : "先选中一段文字再换字体"}
        </p>
        <div className="grid gap-1.5">
          {FONTS.map((f) => (
            <button
              key={f.id}
              disabled={!isText}
              onClick={() => {
                begin();
                update(el!.id, { fontFamily: f.stack });
                end();
              }}
              className="border-sakura-100 enabled:hover:border-sakura-300 flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left transition disabled:opacity-45"
              style={{ fontFamily: f.stack }}
            >
              <span className="text-ink-800 text-sm">{f.name}</span>
              <span className="text-ink-400 shrink-0 font-sans text-[10px]">{f.hint}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
