"use client";

import { useState } from "react";
import clsx from "clsx";
import { useJson } from "./AdminApp";
import { Icon } from "@/components/ui/icons";

interface Sub {
  id: string; title: string; note: string; status: string; reviewNote: string;
  printed: boolean; qq: string; nickname: string;
  thumb: string; front: string; back: string;
  frontBytes: number; backBytes: number; createdAt: number; reviewedAt: number | null;
}

const FILTERS = [
  { id: "pending", label: "待审核" },
  { id: "approved", label: "已通过" },
  { id: "rejected", label: "未通过" },
  { id: "all", label: "全部" },
];

export function ReviewTab() {
  const [status, setStatus] = useState("pending");
  const { data, loading, err, reload } = useJson<{ submissions: Sub[]; stats: Record<string, number> }>(
    `/api/admin/submissions?status=${status}`,
    [status],
  );
  const [open, setOpen] = useState<Sub | null>(null);

  async function act(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setOpen(null);
    reload();
  }

  const stats = data?.stats ?? {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              status === f.id ? "bg-ink-800 text-white" : "border-sakura-200 text-ink-600 border bg-white",
            )}
          >
            {f.label}
            {f.id !== "all" && stats[f.id] !== undefined && (
              <span className="ml-1.5 opacity-60">{stats[f.id]}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <a
          href={`/api/admin/export?status=${status === "all" ? "approved" : status}`}
          className="btn btn-primary px-3.5 py-2 text-xs"
        >
          <Icon name="download" size={14} />打包下载（{status === "all" ? "已通过" : FILTERS.find((f) => f.id === status)?.label}）
        </a>
      </div>

      {loading && <p className="text-ink-400 py-10 text-center text-sm">加载中…</p>}
      {err && <p className="py-10 text-center text-sm text-rose-500">{err}</p>}
      {data && data.submissions.length === 0 && (
        <p className="text-ink-400 py-16 text-center text-sm">这里空空的</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.submissions.map((s) => (
          <button
            key={s.id}
            onClick={() => setOpen(s)}
            className="card-soft overflow-hidden p-0 text-left transition hover:-translate-y-0.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.thumb} alt="" className="bg-sakura-50 aspect-[154/106] w-full object-contain" loading="lazy" />
            <div className="p-3">
              <div className="flex items-center gap-2">
                <span className="text-ink-900 min-w-0 flex-1 truncate text-sm font-semibold">
                  {s.title || s.nickname}
                </span>
                <StatusPill status={s.status} printed={s.printed} />
              </div>
              <p className="text-ink-400 mt-1 truncate text-[11px]">QQ {s.qq}</p>
              <p className="text-ink-400 mt-0.5 text-[10px]">
                {new Date(s.createdAt).toLocaleString("zh-CN")}
                {" · "}
                {((s.frontBytes + s.backBytes) / 1048576).toFixed(1)}MB
              </p>
            </div>
          </button>
        ))}
      </div>

      {open && <ReviewDialog sub={open} onClose={() => setOpen(null)} onAct={act} />}
    </div>
  );
}

function StatusPill({ status, printed }: { status: string; printed: boolean }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-600 ring-rose-200",
  };
  const label: Record<string, string> = { pending: "待审", approved: "通过", rejected: "拒绝" };
  return (
    <span className="flex shrink-0 gap-1">
      <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${map[status]}`}>
        {label[status]}
      </span>
      {printed && (
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700 ring-1 ring-sky-200">
          已印
        </span>
      )}
    </span>
  );
}

function ReviewDialog({
  sub, onClose, onAct,
}: {
  sub: Sub;
  onClose: () => void;
  onAct: (id: string, body: Record<string, unknown>) => Promise<void>;
}) {
  const [note, setNote] = useState(sub.reviewNote);
  const [busy, setBusy] = useState(false);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    await onAct(sub.id, body);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-3xl sm:rounded-3xl">
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-cute text-ink-900 text-lg">{sub.title || sub.nickname}</h2>
            <p className="text-ink-400 text-xs">
              QQ {sub.qq} · {new Date(sub.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <StatusPill status={sub.status} printed={sub.printed} />
          <button onClick={onClose} className="text-ink-400 p-1"><Icon name="close" size={18} /></button>
        </div>

        {sub.note && (
          <p className="text-ink-600 mb-3 rounded-xl bg-sakura-50 p-3 text-xs leading-relaxed">
            用户留言：{sub.note}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(["front", "back"] as const).map((f) => (
            <div key={f}>
              <a href={sub[f]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl ring-1 ring-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sub[f]} alt={f} className="w-full" />
              </a>
              <p className="text-ink-400 mt-1 text-center text-[11px]">
                {f === "front" ? "正面" : "反面"}
                {" · "}
                {((f === "front" ? sub.frontBytes : sub.backBytes) / 1048576).toFixed(2)}MB
                {" · "}
                <a href={sub[f]} download className="text-sakura-600 underline">下载</a>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <textarea
            className="input h-16 resize-none text-xs"
            placeholder="拒绝理由 / 给作者的说明（会显示在他的作品页）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
          />
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => run({ status: "approved", reviewNote: note })}
              className="btn flex-1 bg-emerald-500 py-2.5 text-sm text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.8)]"
            >
              <Icon name="check" size={14} />通过
            </button>
            <button
              disabled={busy}
              onClick={() => run({ status: "rejected", reviewNote: note })}
              className="btn flex-1 bg-rose-500 py-2.5 text-sm text-white shadow-[0_8px_20px_-8px_rgba(244,63,94,0.8)]"
            >
              <Icon name="close" size={14} />拒绝
            </button>
            <button
              disabled={busy}
              onClick={() => run({ printed: !sub.printed })}
              className="btn btn-ghost px-4 py-2.5 text-sm"
            >
              {sub.printed ? "标为未印" : "标为已印"}
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                if (!confirm("彻底删除这份稿件和它的图片？不可恢复。")) return;
                setBusy(true);
                await fetch(`/api/admin/submissions/${sub.id}`, { method: "DELETE" });
                onClose();
                location.reload();
              }}
              className="btn btn-ghost border-rose-200 px-4 py-2.5 text-sm text-rose-500"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
