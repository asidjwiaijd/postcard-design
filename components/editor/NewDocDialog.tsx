"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/controls";
import { MiniPreview } from "./MiniPreview";
import { SPEC, cardIsLandscape, turnLabel } from "@/lib/config";
import { buildDoc, type TemplateCtx } from "@/lib/templates";
import type { DesignDoc, SideDoc } from "@/lib/types";

interface Sub {
  id: string; status: string; thumb: string; createdAt: number;
}
interface DocMeta {
  id: string; name: string; createdAt: number; updatedAt: number;
  /** 正面那一页，用来画缩略图；数据坏掉的老稿子可能没有 */
  front: SideDoc | null;
}

/** 相对时间，够看出「哪一份是刚才那张」就行 */
function ago(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

const specMatches = (doc: DesignDoc | null | undefined) =>
  !!doc &&
  doc.spec?.widthMm === SPEC.widthMm &&
  doc.spec?.heightMm === SPEC.heightMm &&
  doc.spec?.bleedMm === SPEC.bleedMm &&
  !!doc.front && !!doc.back;

/**
 * 「新建一张」。三条路：从零开始、回到之前没交的那几张、
 * 或者把交过的作品复制一份接着改。
 */
export function NewDocDialog({
  ctx, currentId, onApply, onOpen, onClose,
}: {
  ctx: TemplateCtx;
  /** 正在改的那份，别让人「打开」自己 */
  currentId?: string | null;
  onApply: (doc: DesignDoc) => void;
  onOpen: (id: string, doc: DesignDoc) => void;
  onClose: () => void;
}) {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [turned, setTurned] = useState(false);

  const loadDocs = useCallback(() => {
    fetch("/api/docs")
      .then((r) => r.json())
      .then((d) => setDocs(d.docs ?? []))
      .catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    loadDocs();
    fetch("/api/submissions")
      .then((r) => r.json())
      .then((d) => setSubs(d.submissions ?? []))
      .catch(() => setSubs([]));
  }, [loadDocs]);

  /** 回到之前那份没交的稿子 */
  async function open(d: DocMeta) {
    setBusy(d.id);
    setErr("");
    try {
      const r = await fetch(`/api/docs/${d.id}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "读不出来");
      if (!specMatches(j.doc)) throw new Error("这份是按旧的尺寸做的，套不进现在的版面");
      onOpen(d.id, { ...(j.doc as DesignDoc), spec: { ...SPEC } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "出了点问题");
    } finally {
      setBusy("");
    }
  }

  async function drop(d: DocMeta) {
    setBusy(d.id);
    await fetch(`/api/docs/${d.id}`, { method: "DELETE" }).catch(() => {});
    setBusy("");
    setDocs((cur) => (cur ?? []).filter((x) => x.id !== d.id));
  }

  /** 把交过的作品复制一份出来接着改 */
  async function reuse(s: Sub) {
    setBusy(s.id);
    setErr("");
    try {
      const r = await fetch(`/api/submissions/${s.id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "读不出来");
      if (!specMatches(d.doc)) throw new Error("这张是按旧的尺寸做的，套不进现在的版面");
      onApply({ ...(d.doc as DesignDoc), spec: { ...SPEC } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "出了点问题");
    } finally {
      setBusy("");
    }
  }

  const starts = [
    { id: "blank", name: "完全空白", desc: "正反两面都清空，自己从头排", icon: "square", f: "f-blank", b: "b-blank" },
    { id: "tpl", name: "常用版式", desc: "正面左图右文，反面标准明信片", icon: "layout", f: "f-split", b: "b-post" },
  ];

  const others = (docs ?? []).filter((d) => d.id !== currentId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-cute text-ink-900 text-lg">新建一张</h2>
            <p className="text-ink-400 mt-0.5 text-xs">
              现在这张会留在下面的「之前做的」里，随时能回去接着改
            </p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-800 -mr-1 p-1">
            <Icon name="close" size={18} />
          </button>
        </div>

        {err && <p className="mt-2 text-xs text-rose-500">{err}</p>}

        {/* ---- 从零开始 ---- */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <h3 className="text-ink-600 text-xs font-semibold">新的一张</h3>
          <div className="bg-sakura-50 border-sakura-100 flex gap-0.5 rounded-xl border p-0.5">
            {[false, true].map((t) => (
              <button
                key={String(t)}
                onClick={() => setTurned(t)}
                className={`flex items-center gap-1 rounded-[0.6rem] px-2 py-1 text-[11px] transition ${
                  turned === t ? "text-sakura-700 bg-white shadow-sm" : "text-ink-400"
                }`}
              >
                <Icon name={cardIsLandscape() !== t ? "landscape" : "portrait"} size={13} />
                {turnLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {starts.map((s) => (
            <button
              key={s.id}
              onClick={() => onApply(buildDoc(ctx, s.f, s.b, turned))}
              className="border-sakura-100 hover:border-sakura-400 hover:bg-sakura-50 flex items-start gap-3 rounded-2xl border bg-white p-3 text-left transition"
            >
              <span className="bg-sakura-50 text-sakura-600 grid h-9 w-9 shrink-0 place-items-center rounded-xl">
                <Icon name={s.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="text-ink-800 block text-sm font-medium">{s.name}</span>
                <span className="text-ink-400 block text-[11px] leading-tight">{s.desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ---- 之前没交的稿子 ---- */}
        <h3 className="text-ink-600 mt-5 text-xs font-semibold">之前做的（没提交）</h3>
        <p className="text-ink-400 mt-0.5 text-[11px]">点一下就回到那张接着改，最多留 20 份</p>
        <div className="mt-2.5">
          {docs === null ? (
            <Spinner label="读取中…" />
          ) : others.length === 0 ? (
            <p className="text-ink-400 border-sakura-200 rounded-xl border border-dashed py-6 text-center text-xs">
              还没有别的稿子，现在这张就是唯一一份
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {others.map((d) => (
                <div
                  key={d.id}
                  className="border-sakura-100 hover:border-sakura-400 group relative overflow-hidden rounded-xl border bg-white transition"
                >
                  <button
                    disabled={!!busy}
                    onClick={() => open(d)}
                    className="block w-full text-left disabled:opacity-50"
                  >
                    <div className="bg-cream-100 grid place-items-center p-1.5">
                      {d.front ? (
                        <MiniPreview side={d.front} width={130} />
                      ) : (
                        <span className="text-ink-400 py-6 text-[10px]">没有预览</span>
                      )}
                    </div>
                    <div className="text-ink-600 truncate px-1.5 py-1 text-[10px]">
                      {d.name || ago(d.updatedAt)}
                    </div>
                  </button>
                  <button
                    onClick={() => drop(d)}
                    title="删掉这份稿子"
                    className="text-ink-400 absolute right-1 top-1 rounded-full bg-white/90 p-1 opacity-0 shadow-sm transition hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---- 交过的作品 ---- */}
        <h3 className="text-ink-600 mt-5 text-xs font-semibold">复用我交过的作品</h3>
        <p className="text-ink-400 mt-0.5 text-[11px]">复制一份出来接着改，原来那张还在</p>
        <div className="mt-2.5">
          {subs === null ? (
            <Spinner label="读取中…" />
          ) : subs.length === 0 ? (
            <p className="text-ink-400 border-sakura-200 rounded-xl border border-dashed py-6 text-center text-xs">
              还没有交过稿，先做一张吧
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {subs.map((s) => (
                <button
                  key={s.id}
                  disabled={!!busy}
                  onClick={() => reuse(s)}
                  className="border-sakura-100 hover:border-sakura-400 overflow-hidden rounded-xl border bg-white text-left transition disabled:opacity-50"
                >
                  <div className="bg-cream-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumb} alt="" className="block w-full" loading="lazy" />
                    {busy === s.id && (
                      <span className="absolute inset-0 grid place-items-center bg-white/70 text-[10px]">载入中…</span>
                    )}
                  </div>
                  <div className="text-ink-600 truncate px-1.5 py-1 text-[10px]">
                    {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
