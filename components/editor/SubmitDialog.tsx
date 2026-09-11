"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type Konva from "konva";
import { useEditor } from "./store";
import { prepareForExport, renderSide, downloadBlob } from "./export";
import { MiniPreview } from "./MiniPreview";
import { SPEC, SITE, LIMITS, pageExportW, pageExportH, turnLabel } from "@/lib/config";
import { Icon } from "@/components/ui/icons";
import type { SideId } from "@/lib/types";
import type { EditorUser } from "./EditorShell";

type Phase = "form" | "rendering" | "uploading" | "done" | "error";

export function SubmitDialog({
  user, scale, getLayer, onClose,
}: {
  user: EditorUser;
  scale: number;
  getLayer: (s: SideId) => Konva.Layer | null;
  onClose: () => void;
}) {
  const doc = useEditor((s) => s.doc);
  const router = useRouter();

  // 空照片位是编辑器里的虚线提示，不该印出来；导出时藏掉，并提前告诉用户
  const emptySlots = (sd: SideId) =>
    doc[sd].elements.filter((e) => e.type === "image" && !e.src).map((e) => e.id);
  const emptyCount = emptySlots("front").length + emptySlots("back").length;
  // 正反面朝向不一样时印厂要把其中一面转过来，先说清楚
  const mixedTurn = !!doc.front.turned !== !!doc.back.turned;

  const [agree, setAgree] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState<{ id: string; front: string; back: string } | null>(null);

  async function submit() {
    setPhase("rendering");
    setMsg("正在按 300dpi 渲染两面…");
    try {
      const front = getLayer("front");
      const back = getLayer("back");
      if (!front || !back) throw new Error("画布还没准备好，稍等一下再试");

      await prepareForExport(doc);
      const frontBlob = await renderSide(front, scale, emptySlots("front"), !!doc.front.turned);
      const backBlob = await renderSide(back, scale, emptySlots("back"), !!doc.back.turned);

      setPhase("uploading");
      setMsg("上传并压缩中，图大的话要等十几秒…");

      const fd = new FormData();
      fd.append("front", frontBlob, "front.png");
      fd.append("back", backBlob, "back.png");
      fd.append("doc", JSON.stringify(doc));

      const r = await fetch("/api/submissions", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "提交失败");

      setResult({ id: d.submission.id, front: d.submission.front, back: d.submission.back });
      setPhase("done");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "出了点问题");
      setPhase("error");
    }
  }

  const busy = phase === "rendering" || phase === "uploading";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl">
        {phase === "done" && result ? (
          <div className="space-y-4 text-center">
            <Icon name="checkCircle" size={44} className="text-sakura-500 mx-auto" />
            <h2 className="font-cute text-ink-900 text-xl">提交成功</h2>
            <p className="text-ink-600 text-sm">
              {SITE.downloadBeforeReview
                ? "社团会看到这张稿子。你现在就能把成品图存下来。"
                : "社团会看到这张稿子。审核通过之后就能在「我的作品」里下载成品图。"}
            </p>
            {SITE.downloadBeforeReview && (
              <div className="grid grid-cols-2 gap-2">
                {(["front", "back"] as const).map((s) => (
                  <a
                    key={s}
                    href={result[s]}
                    download={`明信片-${s === "front" ? "正面" : "反面"}-${result.id}.webp`}
                    className="btn btn-ghost py-2 text-xs"
                  >
                    <Icon name="download" size={14} />
                    下载{s === "front" ? "正面" : "反面"}
                  </a>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn btn-ghost flex-1 py-2.5 text-sm">
                继续改
              </button>
              <button
                onClick={() => router.push("/my")}
                className="btn btn-primary flex-1 py-2.5 text-sm"
              >
                看我的作品
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-cute text-ink-900 text-lg">提交给社团</h2>
            <p className="text-ink-400 mt-0.5 text-xs">
              还剩 {user.quota - user.used} 张名额 · 提交后仍可继续改并再提交新的
            </p>

            <div className="my-4 grid grid-cols-2 gap-2">
              {(["front", "back"] as SideId[]).map((s) => (
                <div key={s}>
                  <div className="overflow-hidden rounded-lg ring-1 ring-black/10">
                    <MiniPreview side={doc[s]} width={220} />
                  </div>
                  <p className="text-ink-400 mt-1 text-center text-[10px]">
                    {s === "front" ? "正面" : "反面"} · {turnLabel(!!doc[s].turned)}
                  </p>
                </div>
              ))}
            </div>

            {emptyCount > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-700 ring-1 ring-amber-200">
                <Icon name="alert" size={14} className="mt-px shrink-0" />
                <span>
                  还有 {emptyCount} 个照片位没放图。它们不会被印出来，那块地方会是空的——
                  不想留白就先回去补图。
                </span>
              </p>
            )}

            {mixedTurn && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-700 ring-1 ring-amber-200">
                <Icon name="alert" size={14} className="mt-px shrink-0" />
                <span>
                  正面是{turnLabel(!!doc.front.turned)}、反面是{turnLabel(!!doc.back.turned)}。
                  同一张卡只有一个形状，印的时候会有一面被转 90° 印上去——
                  想让两面一致就回去把朝向调成一样的。
                </span>
              </p>
            )}

            <div className="space-y-3">
              <label className="text-ink-600 flex items-start gap-2 text-xs leading-relaxed">
                <input
                  type="checkbox" checked={agree} className="accent-sakura-500 mt-0.5"
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  我确认画面里的图片是我自己的、或已获得授权可以印刷分发，
                  并同意社团把它印成物料在活动上发放。
                </span>
              </label>
            </div>

            <div className="text-ink-400 mt-3 rounded-xl bg-sakura-50 p-2.5 text-[10px] leading-relaxed">
              成品 {SPEC.widthMm}×{SPEC.heightMm}mm（含 {SPEC.bleedMm}mm 出血）
              {" · "}正面 {pageExportW(!!doc.front.turned)}×{pageExportH(!!doc.front.turned)}px
              {" · 反面 "}{pageExportW(!!doc.back.turned)}×{pageExportH(!!doc.back.turned)}px @{SPEC.dpi}dpi
              {` · 每面自动压到 ${(LIMITS.renderTargetBytes / 1048576).toFixed(1)}MB 以内`}
            </div>

            {msg && (
              <p className={`mt-3 text-xs ${phase === "error" ? "text-rose-500" : "text-ink-600"}`}>
                {msg}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={onClose} disabled={busy} className="btn btn-ghost flex-1 py-2.5 text-sm">
                再改改
              </button>
              <button
                onClick={submit}
                disabled={!agree || busy}
                className="btn btn-primary flex-[2] py-2.5 text-sm"
              >
                {busy ? "处理中…" : "确认提交"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { downloadBlob };
