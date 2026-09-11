"use client";

import { useId, useState } from "react";
import clsx from "clsx";
import { Icon } from "./icons";

export const PALETTE = [
  "#ffffff", "#fff5f9", "#ffd9e6", "#ffb3d1", "#ff7fa8", "#ff5c91", "#ec3b76", "#c72a5e",
  "#ffe1a3", "#ffc93c", "#ffa552", "#ff7a5c", "#b8e0d2", "#4ecdc4", "#8fb8ff", "#7c6cf6",
  "#a394ff", "#ddd5ff", "#8b8296", "#5b5266", "#372f42", "#241d2e", "#2b2440", "#000000",
];

export function Field({
  label, children, hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-ink-600 text-xs font-medium">{label}</span>
        {hint && <span className="text-ink-400 text-[10px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  value, min, max, step = 1, onChange, onCommit, suffix, decimals = 0,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; onCommit?: () => void;
  suffix?: string; decimals?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        type="range"
        className="accent-sakura-500 h-5 flex-1 cursor-pointer"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
      <span className="text-ink-600 w-12 shrink-0 text-right font-mono text-[11px] tabular-nums">
        {value.toFixed(decimals)}
        {suffix}
      </span>
    </div>
  );
}

export function ColorInput({
  value, onChange, onCommit, allowTransparent,
}: {
  value: string; onChange: (v: string) => void; onCommit?: () => void;
  allowTransparent?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const isClear = value === "transparent" || value === "#00000000";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="border-sakura-200 h-8 w-8 shrink-0 rounded-lg border-2 shadow-inner"
          style={{
            background: isClear
              ? "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50%/10px 10px"
              : value,
          }}
          aria-label="选择颜色"
        />
        <input
          className="input flex-1 py-1 font-mono text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
        />
        <label
          htmlFor={id}
          className="btn btn-ghost h-8 cursor-pointer px-2.5 text-xs"
          title="取色器"
        >
          <Icon name="palette" size={14} />
          <input
            id={id} type="color" className="sr-only"
            value={isClear ? "#ffffff" : value.slice(0, 7)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onCommit}
          />
        </label>
      </div>
      {open && (
        <div className="border-sakura-100 grid grid-cols-8 gap-1.5 rounded-xl border bg-white p-2">
          {allowTransparent && (
            <button
              type="button"
              onClick={() => { onChange("#00000000"); onCommit?.(); }}
              className="border-sakura-200 aspect-square rounded-md border"
              style={{ background: "repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50%/8px 8px" }}
              title="透明"
            />
          )}
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); onCommit?.(); }}
              className={clsx(
                "aspect-square rounded-md border transition",
                value.toLowerCase() === c ? "ring-sakura-500 border-white ring-2" : "border-black/10",
              )}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SegBar<T extends string>({
  value, options, onChange, size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="bg-sakura-50 border-sakura-100 flex gap-0.5 rounded-xl border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex-1 rounded-[0.6rem] font-medium transition",
            size === "sm" ? "px-1.5 py-1 text-[11px]" : "px-2 py-1.5 text-xs",
            value === o.value
              ? "text-sakura-700 bg-white shadow-sm"
              : "text-ink-400 hover:text-ink-600",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IconBtn({
  onClick, title, children, disabled, active, danger,
}: {
  onClick?: () => void; title: string; children: React.ReactNode;
  disabled?: boolean; active?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-base transition",
        "disabled:cursor-not-allowed disabled:opacity-35",
        danger
          ? "border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100"
          : active
            ? "border-sakura-300 bg-sakura-100 text-sakura-700"
            : "border-sakura-200 text-ink-600 bg-white hover:bg-sakura-50",
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="text-ink-400 flex items-center gap-2 text-xs">
      <span className="border-sakura-200 border-t-sakura-500 h-4 w-4 animate-spin rounded-full border-2" />
      {label}
    </div>
  );
}
