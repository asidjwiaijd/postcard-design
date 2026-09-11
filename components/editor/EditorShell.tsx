"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import clsx from "clsx";
import { useEditor } from "./store";
import { Inspector } from "./Inspector";
import { TemplatePanel } from "./panels/TemplatePanel";
import { TextPanel } from "./panels/TextPanel";
import { PhotoPanel, ASSET_ADDED } from "./panels/PhotoPanel";
import { StickerPanel } from "./panels/StickerPanel";
import { BackgroundPanel } from "./panels/BackgroundPanel";
import { LayerPanel } from "./panels/LayerPanel";
import { SubmitDialog } from "./SubmitDialog";
import { NewDocDialog } from "./NewDocDialog";
import { TurnSwitch } from "./TurnSwitch";
import { GuideDialog, guideSeen } from "./GuideDialog";
import { useCanvasGesture } from "./useCanvasGesture";
import { IconBtn } from "@/components/ui/controls";
import { Icon } from "@/components/ui/icons";
import { pageW, pageH, SITE, turnLabel, cardIsLandscape } from "@/lib/config";
import type { DesignDoc, SideId, TextElement } from "@/lib/types";
import { buildDoc, type TemplateCtx } from "@/lib/templates";
import type { StageHandle } from "./Canvas";

const SideCanvas = dynamic(() => import("./Canvas").then((m) => m.SideCanvas), {
  ssr: false,
  loading: () => (
    <div className="border-sakura-200 grid aspect-[154/106] w-full place-items-center rounded-lg border bg-white">
      <span className="text-ink-400 text-xs">画布加载中…</span>
    </div>
  ),
});

export interface EditorUser {
  id: string; qq: string; nickname: string; avatar: string; quota: number; used: number;
}

const TABS = [
  { id: "template", label: "模板", icon: "layout" },
  { id: "text", label: "文字", icon: "type" },
  { id: "photo", label: "图片", icon: "image" },
  { id: "sticker", label: "贴纸", icon: "sparkles" },
  { id: "bg", label: "背景", icon: "palette" },
  { id: "layer", label: "图层", icon: "layers" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function EditorShell({
  user, initialDoc, initialDocId, campaignLeft,
}: {
  user: EditorUser;
  initialDoc: DesignDoc | null;
  /** 正在改的那份稿子在库里的 id。为 null 表示还没落过库，第一次自动保存时会新建 */
  initialDocId: string | null;
  /** 这次征集还能收几张；null = 不限 */
  campaignLeft: number | null;
}) {
  const ctx: TemplateCtx = useMemo(
    () => ({ qq: user.qq, nickname: user.nickname, avatar: user.avatar, clubName: SITE.clubName }),
    [user],
  );

  const doc = useEditor((s) => s.doc);
  const setDoc = useEditor((s) => s.setDoc);
  const side = useEditor((s) => s.side);
  const setSide = useEditor((s) => s.setSide);
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const setSelection = useEditor((s) => s.setSelection);
  const showGuides = useEditor((s) => s.showGuides);
  const toggleGuides = useEditor((s) => s.toggleGuides);
  const ratioLock = useEditor((s) => s.ratioLock);
  const toggleRatioLock = useEditor((s) => s.toggleRatioLock);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const dirty = useEditor((s) => s.dirty);
  const markSaved = useEditor((s) => s.markSaved);

  const [tab, setTab] = useState<TabId>("template");
  const [sheet, setSheet] = useState<TabId | "props" | null>(null);
  const [zoom, setZoom] = useState(1);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [toast, setToast] = useState<{ text: string; action?: { label: string; run: () => void } } | null>(null);
  const [, setDocId] = useState(initialDocId);

  const wrapRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<StageHandle>(null);
  const backRef = useRef<StageHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slotTarget = useRef<string | null>(null);
  // 自动保存要用它，放 ref 里免得每次变化都重挂 effect
  const docIdRef = useRef<string | null>(initialDocId);

  // 首次进入：优先恢复草稿，否则给一套默认模板
  useEffect(() => {
    setDoc(initialDoc ?? buildDoc(ctx, "f-sign", "b-post"));
    // 第一次进编辑器先把出血、安全区和内容规范讲一遍
    if (!guideSeen()) setGuideOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画布可用区域。<main> 要等 doc 就绪才挂载，所以这里必须等它出现再观察
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setBox({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [!!doc]);

  // 当前这一面的版面：竖版页长短边是对调的
  const turned = !!doc?.[side]?.turned;
  const PW = pageW(turned);
  const PH = pageH(turned);
  const fitScale = box.w ? Math.max(0.4, Math.min((box.w - 16) / PW, (box.h - 16) / PH)) : 2;
  const scale = fitScale * zoom;

  // 双指缩放/平移。手势过程中只动 CSS transform，松手才并进 zoom
  const { resetPan } = useCanvasGesture({ host: wrapRef, plate: plateRef, zoom, setZoom, ready: !!doc });
  const fitWindow = useCallback(() => { setZoom(1); resetPan(); }, [resetPan]);
  // 换面、换朝向之后原来的偏移就没意义了
  useEffect(() => { fitWindow(); }, [side, turned, fitWindow]);

  /**
   * 写回这份稿子。还没有 id（刚点了「新建」）就先建一份——
   * 这样空白稿不会一进编辑器就占一个位置，改过才留下来。
   */
  const persist = useCallback(async (d: DesignDoc) => {
    const id = docIdRef.current;
    if (id) {
      const r = await fetch(`/api/docs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (r.ok) return;
      // 404：在别处被删了，下面重新建一份，别让这次改动丢掉
      if (r.status !== 404) throw new Error("保存失败");
      docIdRef.current = null;
    }
    const r = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: d }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "保存失败");
    docIdRef.current = j.id;
    setDocId(j.id);
  }, []);

  // 自动保存
  useEffect(() => {
    if (!doc || !dirty) return;
    setSaveState("saving");
    const t = setTimeout(() => {
      persist(doc)
        .then(() => { markSaved(); setSaveState("saved"); })
        .catch(() => setSaveState("idle"));
    }, 1500);
    return () => clearTimeout(t);
  }, [doc, dirty, markSaved, persist]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.action ? 6000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      const s = useEditor.getState();
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        s.setSelection(s.doc[s.side].elements.filter((x) => !x.locked).map((x) => x.id));
      } else if (mod && e.key.toLowerCase() === "d" && s.selected.length) {
        e.preventDefault();
        s.duplicateMany(s.selected);
      } else if ((e.key === "Delete" || e.key === "Backspace") && s.selected.length) {
        e.preventDefault();
        s.removeMany(s.selected);
      } else if (e.key.startsWith("Arrow") && s.selected.length) {
        e.preventDefault();
        const d = e.shiftKey ? 5 : 0.5;
        s.begin();
        s.nudge(
          s.selected,
          e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0,
          e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0,
        );
        s.end();
      } else if (e.key === "Escape") {
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, select]);

  const onPatch = useCallback((id: string, patch: Record<string, unknown>) => {
    useEditor.getState().update(id, patch);
  }, []);

  /** 双击元素：文字进原地编辑，图片/照片位直接弹文件选择 */
  const activate = useCallback((id: string) => {
    const s = useEditor.getState();
    const el = s.doc[s.side].elements.find((e) => e.id === id);
    if (!el) return;
    if (el.type === "text") {
      setEditingText(id);
      return;
    }
    if (el.type === "image") {
      slotTarget.current = id;
      fileRef.current?.click();
    }
  }, []);

  async function fillSlot(file: File) {
    const id = slotTarget.current;
    slotTarget.current = null;
    if (!id) return;
    setToast({ text: "上传中…" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "上传失败");
      // 图片面板也得知道多了一张，不然要刷新才看得见
      window.dispatchEvent(new CustomEvent(ASSET_ADDED, { detail: d.asset }));
      const s = useEditor.getState();
      s.begin();
      s.update(id, { assetId: d.asset.id, src: d.asset.src });
      s.end();
      setToast(null);
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : "上传失败" });
    }
  }

  const getStage = (s: SideId) => (s === "front" ? frontRef.current : backRef.current);

  if (!doc) {
    return <div className="bg-dreamy text-ink-400 grid min-h-dvh place-items-center text-sm">准备画布…</div>;
  }

  const panelFor = (id: TabId | "props") => {
    switch (id) {
      case "template": return <TemplatePanel ctx={ctx} onNew={() => setNewOpen(true)} onGuide={() => setGuideOpen(true)} />;
      case "text": return <TextPanel />;
      case "photo": return <PhotoPanel qq={user.qq} />;
      case "sticker": return <StickerPanel />;
      case "bg": return <BackgroundPanel />;
      case "layer": return <LayerPanel />;
      case "props": return <Inspector onActivate={activate} />;
    }
  };

  const remaining = user.quota - user.used;
  // 全站收满了谁都交不了，按钮上直接说清楚，别让人渲染完才被拒
  const full = campaignLeft === 0;
  const submitHint = full
    ? "这次征集已经收满了"
    : remaining <= 0
      ? "名额已用完"
      : "提交给社团";

  return (
    <div className="bg-dreamy flex h-dvh flex-col overflow-hidden">
      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) fillSlot(f);
        }}
      />

      {/* ---------------- 顶栏 ---------------- */}
      {/* 320px 那种老机型塞不下一行，宁可换行也别把「提交」挤出屏幕 */}
      <header className="border-sakura-100 z-30 flex shrink-0 flex-wrap items-center gap-1.5 border-b bg-white/85 px-1.5 py-2 backdrop-blur sm:flex-nowrap sm:gap-2 sm:px-3">
        <Link href="/my" className="font-cute text-sakura-600 hidden shrink-0 text-base sm:block">
          {SITE.name}
        </Link>

        <div className="bg-sakura-50 border-sakura-100 flex shrink-0 gap-0.5 rounded-xl border p-0.5">
          {(["front", "back"] as SideId[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={clsx(
                "rounded-[0.6rem] px-2.5 py-1.5 text-xs font-medium transition sm:px-3",
                side === s ? "text-sakura-700 bg-white shadow-sm" : "text-ink-400",
              )}
            >
              {s === "front" ? "正面" : "反面"}
            </button>
          ))}
        </div>

        {/* 这一面横着还是竖着，两面各管各的。手机上收成一个图标按钮 */}
        <TurnSwitch side={side} compact responsive />

        {/* 撤销在手机上同样是刚需，不能藏起来 */}
        <div className="flex gap-1 sm:gap-1.5">
          <IconBtn title="撤销 (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Icon name="undo" /></IconBtn>
          <IconBtn title="重做 (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}><Icon name="redo" /></IconBtn>
          <span className="hidden sm:contents">
            <IconBtn title="出血与安全区参考线" onClick={toggleGuides} active={showGuides}>
              <Icon name="grid" />
            </IconBtn>
            <IconBtn
              title={ratioLock ? "长宽比已锁：拖角只能等比缩放" : "锁住长宽比再拖手柄"}
              onClick={toggleRatioLock}
              active={ratioLock}
            >
              <Icon name="link" />
            </IconBtn>
          </span>
          {/* 手机上也要能新建，这是唯一能翻回之前那几张稿子的入口 */}
          <IconBtn title="新建一张 / 回到之前的稿子" onClick={() => setNewOpen(true)}>
            <Icon name="plus" />
          </IconBtn>
          {/* 手机顶栏位置紧张，「设计须知」挪到模板面板里 */}
          <span className="hidden sm:block">
            <IconBtn title="设计须知：出血、安全区、内容规范" onClick={() => setGuideOpen(true)}>
              <Icon name="help" />
            </IconBtn>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="text-ink-400 hidden text-[11px] md:inline">
            {saveState === "saving" ? "保存中…" : saveState === "saved" ? "草稿已保存" : ""}
          </span>
          <Link href="/my" title="我的作品" className="btn btn-ghost hidden px-3 py-1.5 text-xs sm:inline-flex">
            我的作品
          </Link>
          <Link href="/my" title="我的作品" className="shrink-0 sm:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatar} alt="我的作品" className="border-sakura-200 h-8 w-8 rounded-full border-2 object-cover" />
          </Link>
          <button
            onClick={() => setSubmitOpen(true)}
            disabled={remaining <= 0 || full}
            className="btn btn-primary px-3 py-2 text-xs sm:px-4"
            title={submitHint}
          >
            {full ? "已收满" : "提交"}
            {!full && remaining > 0 && (
              <span className="hidden opacity-70 sm:inline">剩 {remaining}</span>
            )}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------------- 桌面端左侧工具栏 ---------------- */}
        <nav className="border-sakura-100 hidden w-16 shrink-0 flex-col gap-1 border-r bg-white/70 p-2 lg:flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition",
                tab === t.id ? "bg-sakura-100 text-sakura-700" : "text-ink-400 hover:bg-sakura-50",
              )}
            >
              <Icon name={t.icon} size={19} />
              {t.label}
            </button>
          ))}
        </nav>

        <aside className="border-sakura-100 thin-scroll hidden w-72 shrink-0 overflow-y-auto border-r bg-white/70 p-3 lg:block">
          {panelFor(tab)}
        </aside>

        {/* ---------------- 画布 ---------------- */}
        <main ref={wrapRef} className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden p-2">
          <div ref={plateRef} className="relative" style={{ width: PW * scale, height: PH * scale }}>
            <div className="absolute inset-0 rounded-lg bg-white shadow-[0_12px_40px_-12px_rgba(236,59,118,0.35)]" />
            {(["front", "back"] as SideId[]).map((s) => (
              <div key={s} className="absolute inset-0" style={{ display: side === s ? "block" : "none" }}>
                <SideCanvas
                  ref={s === "front" ? frontRef : backRef}
                  sideDoc={doc[s]}
                  scale={scale}
                  selected={side === s ? selected : []}
                  interactive={side === s}
                  showGuides={showGuides}
                  lockRatio={ratioLock}
                  onSelect={select}
                  onSelectMany={setSelection}
                  onChangeStart={() => useEditor.getState().begin()}
                  onChangeEnd={() => useEditor.getState().end()}
                  onPatch={onPatch}
                  onActivate={activate}
                />
              </div>
            ))}
            {editingText && (
              <TextOverlay
                id={editingText}
                scale={scale}
                onClose={() => setEditingText(null)}
              />
            )}
          </div>

          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur lg:bottom-2 lg:right-2 lg:top-auto">
            <IconBtn title="缩小" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><Icon name="minus" /></IconBtn>
            <button
              onClick={fitWindow}
              className="text-ink-600 w-12 text-center text-[11px] tabular-nums"
              title="适应窗口"
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconBtn title="放大" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}><Icon name="plus" /></IconBtn>
          </div>

          <p className="text-ink-400 absolute bottom-2 left-3 hidden items-center gap-1.5 text-[11px] lg:flex">
            <Icon name="marquee" size={13} />
            空白处拖一个框可以多选 · Shift 点选可加选 · 双击照片位放图
          </p>

          {toast && (
            <div className="bg-ink-900/85 absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full py-1.5 pl-3.5 pr-2 text-[11px] text-white">
              <span>{toast.text}</span>
              {toast.action && (
                <button
                  onClick={() => { toast.action!.run(); setToast(null); }}
                  className="bg-sakura-500 hover:bg-sakura-400 rounded-full px-2.5 py-1 text-[11px]"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          )}
        </main>

        {/* ---------------- 桌面端右侧属性栏 ---------------- */}
        <aside className="border-sakura-100 thin-scroll hidden w-72 shrink-0 overflow-y-auto border-l bg-white/70 p-3 xl:block">
          <h3 className="text-ink-600 mb-3 text-xs font-semibold">元素属性</h3>
          <Inspector onActivate={activate} />
        </aside>
      </div>

      {/* ---------------- 移动端底部面板 ---------------- */}
      {sheet && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-black/25" />
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[68dvh] flex-col rounded-t-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
              <span className="text-ink-800 text-sm font-semibold">
                {sheet === "props" ? "元素属性" : TABS.find((t) => t.id === sheet)?.label}
              </span>
              <button onClick={() => setSheet(null)} className="text-ink-400 px-2">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-6">{panelFor(sheet)}</div>
          </div>
        </div>
      )}

      <nav className="border-sakura-100 z-30 flex shrink-0 items-center gap-0.5 border-t bg-white/90 px-1 py-1 backdrop-blur lg:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSheet((s) => (s === t.id ? null : t.id))}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] transition",
              sheet === t.id ? "bg-sakura-100 text-sakura-700" : "text-ink-400",
            )}
          >
            <Icon name={t.icon} size={17} />
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setSheet((s) => (s === "props" ? null : "props"))}
          disabled={!selected.length}
          className={clsx(
            "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] transition disabled:opacity-30",
            sheet === "props" ? "bg-sakura-100 text-sakura-700" : "text-ink-400",
          )}
        >
          <Icon name="sliders" size={17} />
          属性
        </button>
      </nav>

      {/* 移动端：选中元素后给一条快捷操作栏 */}
      {selected.length > 0 && !sheet && (
        <div className="pointer-events-none fixed inset-x-0 bottom-14 z-20 flex justify-center lg:hidden">
          <div className="ring-sakura-100 pointer-events-auto flex gap-1.5 rounded-full bg-white/95 p-1.5 shadow-lg ring-1">
            <IconBtn title="属性" onClick={() => setSheet("props")}><Icon name="sliders" /></IconBtn>
            {/* 转 90° 和锁比例手机上最常用，直接放这条快捷栏 */}
            <IconBtn title="顺时针转 90°" onClick={() => useEditor.getState().rotateBy(selected, 90)}>
              <Icon name="rotateCw" />
            </IconBtn>
            <IconBtn
              title={ratioLock ? "长宽比锁着，再点一下解开" : "锁住长宽比，拖角不变形"}
              active={ratioLock}
              onClick={toggleRatioLock}
            >
              <Icon name="link" />
            </IconBtn>
            <IconBtn title="复制" onClick={() => useEditor.getState().duplicateMany(selected)}><Icon name="copy" /></IconBtn>
            <IconBtn title="撤销" onClick={undo} disabled={!canUndo}><Icon name="undo" /></IconBtn>
            <IconBtn title="删除" danger onClick={() => useEditor.getState().removeMany(selected)}>
              <Icon name="trash" />
            </IconBtn>
          </div>
        </div>
      )}

      {guideOpen && <GuideDialog onClose={() => setGuideOpen(false)} />}

      {newOpen && (
        <NewDocDialog
          ctx={ctx}
          currentId={docIdRef.current}
          onClose={() => setNewOpen(false)}
          onApply={(d) => {
            // 新的一张：先把 id 清掉，下一次自动保存会另开一份，旧的那张留在库里
            docIdRef.current = null;
            setDocId(null);
            setDoc({ ...d }, false);
            useEditor.getState().select(null);
            setNewOpen(false);
            setToast({ text: "新开了一张，之前那张在「＋」里还能找回来" });
          }}
          onOpen={(id, d) => {
            docIdRef.current = id;
            setDocId(id);
            setDoc({ ...d });
            setNewOpen(false);
            setSaveState("saved");
          }}
        />
      )}

      {submitOpen && (
        <SubmitDialog
          user={user}
          scale={scale}
          getLayer={(s) => getStage(s)?.content ?? null}
          onClose={() => setSubmitOpen(false)}
        />
      )}
    </div>
  );
}

/** 双击文字时浮出来的原地编辑框 */
function TextOverlay({ id, scale, onClose }: { id: string; scale: number; onClose: () => void }) {
  const el = useEditor((s) => s.doc[s.side].elements.find((e) => e.id === id)) as TextElement | undefined;
  const update = useEditor((s) => s.update);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    useEditor.getState().begin();
    const t = setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 20);
    return () => {
      clearTimeout(t);
      useEditor.getState().end();
    };
  }, []);

  if (!el) return null;

  return (
    <textarea
      ref={ref}
      value={el.text}
      onChange={(e) => update(id, { text: e.target.value })}
      onBlur={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); onClose(); }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onClose(); }
      }}
      className="ring-sakura-500 absolute z-20 resize-none overflow-hidden rounded-sm bg-white/95 outline-none ring-2"
      style={{
        left: el.x * scale,
        top: el.y * scale,
        width: el.w * scale,
        minHeight: el.fontSize * el.lineHeight * scale,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: "top left",
        fontFamily: el.fontFamily,
        fontSize: el.fontSize * scale,
        lineHeight: el.lineHeight,
        letterSpacing: el.letterSpacing * scale,
        textAlign: el.align,
        color: el.fill,
        padding: 0,
      }}
    />
  );
}
