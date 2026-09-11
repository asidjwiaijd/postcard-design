"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor } from "../store";
import { makeVector, makeShape, makeSticker, SHAPES } from "../factories";
import { VECTORS, VECTOR_CATEGORIES, vectorSvg } from "@/lib/vectors";
import { svgToDataUrl } from "@/lib/patterns";
import { SegBar } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";

interface Sticker {
  id: string; src: string; width: number; height: number; name: string; category: string;
}

export function StickerPanel() {
  const addElements = useEditor((s) => s.addElements);
  const [tab, setTab] = useState<"vector" | "shape" | "club">("vector");
  const [cat, setCat] = useState(VECTOR_CATEGORIES[0]);
  const [club, setClub] = useState<Sticker[]>([]);

  useEffect(() => {
    fetch("/api/stickers")
      .then((r) => r.json())
      .then((d) => setClub(d.stickers ?? []))
      .catch(() => {});
  }, []);

  const thumbs = useMemo(
    () =>
      VECTORS.filter((v) => v.category === cat).map((v) => ({
        v,
        url: svgToDataUrl(vectorSvg(v.id)),
      })),
    [cat],
  );

  return (
    <div className="space-y-3">
      <SegBar
        value={tab}
        onChange={setTab}
        options={[
          { value: "vector", label: "装饰" },
          { value: "shape", label: "形状" },
          { value: "club", label: `社团素材${club.length ? ` ${club.length}` : ""}` },
        ]}
      />

      {tab === "vector" && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {VECTOR_CATEGORIES.map((c) => (
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
          <div className="grid grid-cols-3 gap-2">
            {thumbs.map(({ v, url }) => (
              <button
                key={v.id}
                onClick={() => addElements([makeVector(v.id)])}
                title={v.name}
                className="border-sakura-100 hover:border-sakura-400 grid aspect-square place-items-center rounded-xl border bg-white p-2.5 transition hover:shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={v.name} className="max-h-full max-w-full" />
              </button>
            ))}
          </div>
          <p className="text-ink-400 text-[10px]">插入后可以在右侧改颜色</p>
        </>
      )}

      {tab === "shape" && (
        <div className="grid grid-cols-3 gap-2">
          {SHAPES.map((s) => (
            <button
              key={s.kind}
              onClick={() => addElements([makeShape(s.kind)])}
              className="border-sakura-100 hover:border-sakura-400 text-sakura-500 grid aspect-square place-items-center rounded-xl border bg-white transition"
              title={s.label}
            >
              <Icon name={s.icon} size={26} />
            </button>
          ))}
        </div>
      )}

      {tab === "club" &&
        (club.length === 0 ? (
          <p className="text-ink-400 py-6 text-center text-xs">
            社团还没有上传素材
            <br />
            <span className="text-[10px]">（管理员可在后台的「素材」里添加 Logo、吉祥物等）</span>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {club.map((s) => (
              <button
                key={s.id}
                onClick={() => addElements([makeSticker(s.id, s.src, s.width, s.height)])}
                title={s.name}
                className="border-sakura-100 hover:border-sakura-400 grid aspect-square place-items-center overflow-hidden rounded-xl border bg-white p-1.5 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.name} className="max-h-full max-w-full object-contain" loading="lazy" />
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
