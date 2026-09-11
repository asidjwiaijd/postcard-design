"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "../store";
import { makeImage, makeSlot } from "../factories";
import { FrameGrid } from "../FrameGrid";
import { Spinner } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import type { ImageElement } from "@/lib/types";

export interface Asset {
  id: string; src: string; width: number; height: number; name: string; bytes: number;
}

/** 编辑器里别处（双击照片位）传完图也要出现在这个列表里 */
export const ASSET_ADDED = "pc:asset-added";

export function PhotoPanel({ qq }: { qq: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 选中的是一个照片位时，点图就是「填进去」而不是「再加一张」
  const target = useEditor((s) =>
    s.selected.length === 1
      ? (s.doc[s.side].elements.find((e) => e.id === s.selected[0] && e.type === "image") as ImageElement | undefined)
      : undefined,
  );

  useEffect(() => {
    fetch("/api/uploads")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets ?? []);
        if (d.limit) setLimit(d.limit);
      })
      .catch(() => setErr("素材列表加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const on = (e: Event) => {
      const a = (e as CustomEvent<Asset>).detail;
      setAssets((list) => (list.some((x) => x.id === a.id) ? list : [a, ...list]));
    };
    window.addEventListener(ASSET_ADDED, on);
    return () => window.removeEventListener(ASSET_ADDED, on);
  }, []);

  const upload = useCallback(async (files: FileList | File[]) => {
    setErr("");
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(list.length);
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/uploads", { method: "POST", body: fd });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "上传失败");
        setAssets((a) => [d.asset, ...a]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "上传失败");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }, []);

  async function remove(id: string) {
    setAssets((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/uploads/${id}`, { method: "DELETE" }).catch(() => {});
  }

  /** 有选中的照片位就填进去，否则在画布中间新建一张 */
  function place(a: { id: string; src: string; width: number; height: number }) {
    const st = useEditor.getState();
    const sel = st.selected;
    const el = sel.length === 1 ? st.doc[st.side].elements.find((e) => e.id === sel[0]) : undefined;
    if (el && el.type === "image") {
      st.begin();
      st.update(el.id, { assetId: a.id, src: a.src });
      st.end();
      return;
    }
    st.addElements([makeImage(a.id, a.src, a.width, a.height)]);
  }

  return (
    <div className="space-y-4">
      {target && (
        <div className="bg-sakura-50 text-sakura-700 ring-sakura-200 flex items-start gap-2 rounded-xl p-2.5 text-[11px] leading-relaxed ring-1">
          <Icon name="crop" size={14} className="mt-px shrink-0" />
          <span>
            已经选中一个照片位，下面点哪张图就填哪张。
            {!target.src && "（空位在画布上是虚线形状）"}
          </span>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${
          drag ? "border-sakura-400 bg-sakura-50" : "border-sakura-200 bg-white"
        }`}
      >
        <Icon name="upload" size={22} className="text-sakura-400 mx-auto" />
        <p className="text-ink-800 mt-1.5 text-xs font-medium">点这里选图，或直接拖进来</p>
        <p className="text-ink-400 mt-0.5 text-[10px]">
          JPG / PNG / WebP · 已用 {assets.length}/{limit}
        </p>
        <input
          ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ""; }}
        />
      </div>

      {busy > 0 && <Spinner label={`正在上传 ${busy} 张…`} />}
      {err && <p className="text-xs text-rose-500">{err}</p>}

      <button
        onClick={() => place({ id: `qq:${qq}`, src: `/api/qq/avatar/${qq}`, width: 640, height: 640 })}
        className="border-sakura-100 hover:border-sakura-300 hover:bg-sakura-50 flex w-full items-center gap-3 rounded-xl border bg-white p-2.5 text-left transition"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qq/avatar/${qq}`} alt="" className="h-9 w-9 rounded-full object-cover" />
        <span>
          <span className="text-ink-800 block text-xs font-medium">用我的 QQ 头像</span>
          <span className="text-ink-400 block text-[10px]">已经存在服务器上，印刷时不会掉图</span>
        </span>
      </button>

      <section>
        <h3 className="text-ink-600 mb-1 text-xs font-semibold">形状照片位</h3>
        <p className="text-ink-400 mb-2 text-[11px] leading-relaxed">
          {target ? "点一下把选中的图换成这个形状" : "点一下插入一个空位，图会按形状裁好"}
        </p>
        <FrameGrid
          value={target?.frame}
          onPick={(id) => {
            const st = useEditor.getState();
            if (target) {
              st.begin();
              st.update(target.id, { frame: id });
              st.end();
            } else {
              st.addElements([makeSlot(id)]);
            }
          }}
        />
      </section>

      {loading ? (
        <Spinner label="加载素材…" />
      ) : assets.length === 0 ? (
        <p className="text-ink-400 py-4 text-center text-xs">还没有传过图</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {assets.map((a) => (
            <div key={a.id} className="group relative">
              <button
                onClick={() => place(a)}
                className="border-sakura-100 hover:border-sakura-400 block w-full overflow-hidden rounded-lg border bg-white transition"
                title={a.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt={a.name} className="aspect-square w-full object-cover" loading="lazy" />
              </button>
              <button
                onClick={() => remove(a.id)}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-white text-rose-500 opacity-0 shadow ring-1 ring-rose-200 transition group-hover:opacity-100 focus:opacity-100"
                title="删除"
              >
                <Icon name="close" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
