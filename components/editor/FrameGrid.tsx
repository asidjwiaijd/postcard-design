"use client";

import { FRAMES } from "@/lib/frames";

/** 蒙板形状选择器。缩略图直接用蒙板自己的路径画，所见即所得 */
export function FrameGrid({
  value, onPick, cols = 5,
}: {
  value?: string;
  onPick: (id: string) => void;
  cols?: number;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {FRAMES.map((f) => {
        const active = (value ?? "rect") === f.id;
        return (
          <button
            key={f.id}
            type="button"
            title={f.name}
            onClick={() => onPick(f.id)}
            className={`grid aspect-square place-items-center rounded-lg border p-1.5 transition ${
              active
                ? "border-sakura-400 bg-sakura-50 ring-sakura-200 ring-2"
                : "border-sakura-100 bg-white hover:border-sakura-300"
            }`}
          >
            <svg viewBox="0 0 1 1" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
              <path d={f.d} fill={active ? "#ff5c91" : "#e7bed4"} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
