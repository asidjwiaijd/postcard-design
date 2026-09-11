"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useEditor } from "./store";
import { Icon } from "@/components/ui/icons";
import { cardIsLandscape, turnLabel } from "@/lib/config";
import type { SideId } from "@/lib/types";

/**
 * 这一面横着还是竖着。正反两面各自独立——一张横版卡的背面照样可以竖着排。
 * 刚换完会问一句要不要把已经排好的内容也转过来：换朝向通常是设计之初就定的，
 * 但改到一半才想起来的人也不该重排一遍。
 */
export function TurnSwitch({ side, compact = false, responsive = false }: {
  side: SideId;
  /** 只留图标，不写「横版/竖版」 */
  compact?: boolean;
  /** 顶栏用：窄屏收成一个图标按钮，宽屏还是两段式开关 */
  responsive?: boolean;
}) {
  const turned = useEditor((s) => !!s.doc?.[side]?.turned);
  const count = useEditor((s) => s.doc?.[side]?.elements.length ?? 0);
  const setTurned = useEditor((s) => s.setTurned);
  const turnContent = useEditor((s) => s.turnContent);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    if (!asked) return;
    const t = setTimeout(() => setAsked(false), 8000);
    return () => clearTimeout(t);
  }, [asked]);

  const pick = (t: boolean) => {
    if (t === turned) return;
    setTurned(side, t);
    setAsked(count > 0);
  };

  return (
    <div className={clsx("flex items-center gap-1.5", compact && "shrink-0")}>
      {/* 手机顶栏塞不下两个按钮，收成一个：显示的是当前朝向，点一下换过去 */}
      {responsive && (
        <button
          onClick={() => pick(!turned)}
          title={`这一面现在是${turnLabel(turned)}，点一下改成${turnLabel(!turned)}`}
          aria-label={`朝向：${turnLabel(turned)}`}
          className="border-sakura-200 text-ink-600 hover:bg-sakura-50 grid h-9 w-9 shrink-0 place-items-center rounded-xl border bg-white transition sm:hidden"
        >
          <Icon name={cardIsLandscape() !== turned ? "landscape" : "portrait"} size={17} />
        </button>
      )}

      <div className={clsx(
        "bg-sakura-50 border-sakura-100 shrink-0 gap-0.5 rounded-xl border p-0.5",
        responsive ? "hidden sm:flex" : "flex",
      )}>
        {[false, true].map((t) => (
          <button
            key={String(t)}
            onClick={() => pick(t)}
            title={`把这一面排成${turnLabel(t)}`}
            className={clsx(
              "flex items-center gap-1 rounded-[0.6rem] px-2 py-1.5 text-[11px] transition",
              turned === t ? "text-sakura-700 bg-white shadow-sm" : "text-ink-400",
            )}
          >
            {/* 卡片规格本身可能是竖的，图标按实际形状画 */}
            <Icon name={cardIsLandscape() !== t ? "landscape" : "portrait"} size={14} />
            {!compact && turnLabel(t)}
          </button>
        ))}
      </div>

      {asked && (
        <>
          {/* 电脑上就跟在开关后面 */}
          <button
            onClick={() => { turnContent(side, turned); setAsked(false); }}
            className={clsx(
              "border-sakura-200 text-sakura-600 hover:bg-sakura-50 items-center gap-1 rounded-full border px-2 py-1 text-[11px]",
              responsive ? "hidden sm:flex" : "flex",
            )}
            title="把这一面已经排好的内容整体转 90°"
          >
            <Icon name="rotatePage" size={13} />
            内容也转过来
          </button>
          {/* 手机顶栏那个开关旁边挤不下，浮在底栏上方 */}
          <div className={clsx(
            "pointer-events-none fixed inset-x-0 bottom-24 z-30 justify-center sm:hidden",
            responsive ? "flex" : "hidden",
          )}>
            <button
              onClick={() => { turnContent(side, turned); setAsked(false); }}
              className="bg-ink-900/85 pointer-events-auto flex items-center gap-1.5 rounded-full py-2 pl-3.5 pr-4 text-[12px] text-white shadow-lg"
            >
              <Icon name="rotatePage" size={14} />
              已排好的内容也转过来
            </button>
          </div>
        </>
      )}
    </div>
  );
}
