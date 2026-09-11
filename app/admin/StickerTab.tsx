"use client";

import { useRef, useState } from "react";
import { useJson } from "./AdminApp";
import { Icon } from "@/components/ui/icons";

interface Sticker {
  id: string; src: string; name: string; category: string;
  width: number; height: number; bytes: number;
}

export function StickerTab() {
  const { data, loading, reload } = useJson<{ stickers: Sticker[] }>("/api/admin/stickers");
  const [category, setCategory] = useState("社团素材");
  const [busy, setBusy] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setBusy(list.length);
    for (const f of list) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("category", category);
      await fetch("/api/admin/stickers", { method: "POST", body: fd }).catch(() => {});
      setBusy((n) => n - 1);
    }
    reload();
  }

  const groups = (data?.stickers ?? []).reduce<Record<string, Sticker[]>>((acc, s) => {
    (acc[s.category || "未分组"] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="card-soft p-4">
        <h2 className="font-cute text-ink-900 mb-1 text-base">上传社团素材</h2>
        <p className="text-ink-400 mb-3 text-[11px]">
          社团 Logo、吉祥物立绘、往期主视觉都可以放进来，所有人在编辑器的「贴纸 → 社团素材」里都能用。
          建议用透明底 PNG。
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="input max-w-[200px]" placeholder="分组名"
            value={category} onChange={(e) => setCategory(e.target.value)}
          />
          <button onClick={() => inputRef.current?.click()} className="btn btn-primary px-4 py-2 text-sm">
            选择图片上传
          </button>
          <input
            ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }}
          />
          {busy > 0 && <span className="text-ink-400 self-center text-xs">上传中 {busy}…</span>}
        </div>
      </div>

      {loading && <p className="text-ink-400 py-8 text-center text-sm">加载中…</p>}

      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat}>
          <h3 className="text-ink-600 mb-2 text-xs font-semibold">{cat} · {items.length}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {items.map((s) => (
              <div key={s.id} className="group relative">
                <div className="border-sakura-100 grid aspect-square place-items-center overflow-hidden rounded-xl border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`删除素材「${s.name}」？已经用过它的稿件不受影响。`)) return;
                    await fetch(`/api/admin/stickers/${s.id}`, { method: "DELETE" });
                    reload();
                  }}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-rose-500 shadow ring-1 ring-rose-200 opacity-0 transition group-hover:opacity-100"
                >
                  <Icon name="close" size={12} />
                </button>
                <p className="text-ink-400 mt-1 truncate text-center text-[10px]">{s.name}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {data?.stickers.length === 0 && (
        <p className="text-ink-400 py-10 text-center text-sm">还没有素材</p>
      )}
    </div>
  );
}
