"use client";

import { useEditor } from "../store";
import { BG_PRESETS } from "../factories";
import { PATTERNS, patternSvg, svgToDataUrl } from "@/lib/patterns";
import { ColorInput, Field, SegBar, Slider } from "@/components/ui/controls";
import type { Fill } from "@/lib/types";

export function BackgroundPanel() {
  const side = useEditor((s) => s.side);
  const sideDoc = useEditor((s) => s.doc[s.side]);
  const setBackground = useEditor((s) => s.setBackground);
  const setPattern = useEditor((s) => s.setPattern);
  const begin = useEditor((s) => s.begin);
  const end = useEditor((s) => s.end);

  const bg = sideDoc.background;
  const pat = sideDoc.pattern;

  const patch = (p: Partial<Fill>) => setBackground({ ...bg, ...p });

  return (
    <div className="space-y-5">
      <section>
        <h3 className="text-ink-600 mb-2 text-xs font-semibold">背景预设</h3>
        <div className="grid grid-cols-4 gap-2">
          {BG_PRESETS.map((p) => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => { begin(); setBackground(p.fill); end(); }}
              className="border-sakura-100 hover:border-sakura-400 aspect-[4/3] rounded-lg border transition"
              style={{
                background:
                  p.fill.type === "linear"
                    ? `linear-gradient(${(p.fill.angle ?? 0) + 90}deg, ${p.fill.color}, ${p.fill.color2})`
                    : p.fill.color,
              }}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SegBar
          value={bg.type}
          onChange={(t) => { begin(); patch({ type: t, color2: bg.color2 ?? "#b9a7ff", angle: bg.angle ?? 35 }); end(); }}
          options={[{ value: "solid" as const, label: "纯色" }, { value: "linear" as const, label: "渐变" }]}
        />
        <Field label={bg.type === "linear" ? "渐变起点色" : "颜色"}>
          <ColorInput value={bg.color} onChange={(c) => patch({ color: c })} onCommit={end} />
        </Field>
        {bg.type === "linear" && (
          <>
            <Field label="渐变终点色">
              <ColorInput value={bg.color2 ?? "#b9a7ff"} onChange={(c) => patch({ color2: c })} onCommit={end} />
            </Field>
            <Field label="角度">
              <Slider
                value={bg.angle ?? 35} min={0} max={360}
                onChange={(v) => { begin(); patch({ angle: v }); }}
                onCommit={end} suffix="°"
              />
            </Field>
          </>
        )}
      </section>

      {side === "back" && (
        <section>
          <h3 className="text-ink-600 mb-1 text-xs font-semibold">邮政底纹</h3>
          <p className="text-ink-400 mb-2.5 text-[11px]">
            背面的邮编格、邮票框和地址线。选好底纹后还能在上面自由加内容。
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PATTERNS.map((p) => {
              const active = (pat?.id ?? "none") === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    setPattern(
                      p.id === "none"
                        ? { id: "none", color: p.color, accent: p.accent, opacity: 1 }
                        : { id: p.id, color: pat?.color ?? p.color, accent: pat?.accent ?? p.accent, opacity: pat?.opacity ?? 1 },
                    )
                  }
                  className={`rounded-xl border p-1.5 text-left transition ${
                    active ? "border-sakura-400 bg-sakura-50 ring-sakura-200 ring-2" : "border-sakura-100 bg-white hover:border-sakura-300"
                  }`}
                >
                  <div className="overflow-hidden rounded-md bg-white ring-1 ring-black/5">
                    {p.id === "none" ? (
                      <div className="text-ink-400 grid h-[52px] place-items-center text-[10px]">空白</div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={svgToDataUrl(patternSvg(p.id, { color: pat?.color ?? p.color, accent: pat?.accent ?? p.accent }))}
                        alt={p.name} className="w-full"
                      />
                    )}
                  </div>
                  <div className="text-ink-800 mt-1 text-[11px] font-medium">{p.name}</div>
                  <div className="text-ink-400 text-[10px] leading-tight">{p.desc}</div>
                </button>
              );
            })}
          </div>

          {pat && pat.id !== "none" && (
            <div className="mt-3 space-y-3">
              <Field label="主色" hint="邮编格">
                <ColorInput value={pat.color} onChange={(c) => setPattern({ ...pat, color: c })} />
              </Field>
              <Field label="辅色" hint="地址线 / 邮票框">
                <ColorInput value={pat.accent} onChange={(c) => setPattern({ ...pat, accent: c })} />
              </Field>
              <Field label="浓淡">
                <Slider
                  value={pat.opacity} min={0.15} max={1} step={0.05} decimals={2}
                  onChange={(v) => setPattern({ ...pat, opacity: v })}
                />
              </Field>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
