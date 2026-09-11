"use client";

import { useId, useMemo } from "react";
import type { Fill, SideDoc } from "@/lib/types";
import { pageW, pageH } from "@/lib/config";
import { vectorSvg } from "@/lib/vectors";
import { patternSvg, svgToDataUrl } from "@/lib/patterns";
import { frameById, isClipped } from "@/lib/frames";

/**
 * 模板缩略图。用 DOM 而不是再开一个 Konva Stage：
 * 选模板时可能同时显示十几个预览，开十几个 canvas 太重。
 * 它只求「一眼看出版式」，不追求逐像素还原。
 */
function css(f: Fill) {
  return f.type === "linear"
    ? `linear-gradient(${(f.angle ?? 0) + 90}deg, ${f.color}, ${f.color2 ?? f.color})`
    : f.color;
}

export function MiniPreview({ side, width = 168 }: { side: SideDoc; width?: number }) {
  // 竖版那一面长短边是对调的，缩略图也得跟着变形状
  const turned = !!side.turned;
  const k = width / pageW(turned);
  // clipPath 得有唯一 id，同一页上可能并排十几个预览
  const uid = useId().replace(/:/g, "");
  const patUrl = useMemo(() => {
    const p = side.pattern;
    if (!p || p.id === "none") return null;
    return svgToDataUrl(patternSvg(p.id, { color: p.color, accent: p.accent, opacity: p.opacity, turned }));
  }, [side.pattern, turned]);

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{ width, height: pageH(turned) * k, background: css(side.background) }}
    >
      {patUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={patUrl} alt="" className="absolute inset-0 h-full w-full" />
      )}
      {side.elements.map((el) => {
        const base: React.CSSProperties = {
          position: "absolute",
          left: el.x * k,
          top: el.y * k,
          width: el.w * k,
          height: el.h * k,
          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          transformOrigin: "top left",
          opacity: el.opacity,
        };
        if (el.type === "text") {
          return (
            <div
              key={el.id}
              style={{
                ...base,
                height: "auto",
                fontSize: Math.max(2, el.fontSize * k),
                fontFamily: el.fontFamily,
                color: el.fill,
                textAlign: el.align,
                lineHeight: el.lineHeight,
                whiteSpace: "pre-wrap",
                overflow: "hidden",
              }}
            >
              {el.text}
            </div>
          );
        }
        if (el.type === "vector") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={el.id} alt=""
              src={svgToDataUrl(vectorSvg(el.vectorId, el.color, el.color2))}
              style={{ ...base, objectFit: "fill" }}
            />
          );
        }
        if (el.type === "image" || el.type === "sticker") {
          const frameId = el.type === "image" ? el.frame : undefined;
          const empty = el.type === "image" && !el.src;
          if (empty || isClipped(frameId)) {
            const fr = frameById(frameId);
            const w = el.w * k;
            const h = el.h * k;
            const cid = `${uid}-${el.id}`;
            return (
              <svg key={el.id} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={base}>
                {empty ? (
                  <path
                    d={fr.d} transform={`scale(${w},${h})`}
                    fill="#fbeff6" stroke="#eec6de" strokeWidth={1}
                    strokeDasharray="3 2" vectorEffect="non-scaling-stroke"
                  />
                ) : (
                  <>
                    <defs>
                      <clipPath id={cid}>
                        <path d={fr.d} transform={`scale(${w},${h})`} />
                      </clipPath>
                    </defs>
                    <image
                      href={el.src} width={w} height={h}
                      preserveAspectRatio="xMidYMid slice" clipPath={`url(#${cid})`}
                    />
                  </>
                )}
              </svg>
            );
          }
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={el.id} alt="" src={el.src}
              style={{
                ...base,
                objectFit: el.type === "image" && el.fit === "contain" ? "contain" : "cover",
                borderRadius: el.type === "image" ? el.radius * k : 0,
                background: "#f0eaf3",
              }}
            />
          );
        }
        const s = el;
        return (
          <div
            key={el.id}
            style={{
              ...base,
              background: css(s.fill),
              borderRadius:
                s.shape === "ellipse" ? "50%" : s.shape === "rect" ? s.radius * k : undefined,
              border: s.strokeWidth ? `${Math.max(0.5, s.strokeWidth * k)}px solid ${s.stroke}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
