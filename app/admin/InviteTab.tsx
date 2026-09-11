"use client";

import { useState } from "react";
import { useJson } from "./AdminApp";
import { Icon } from "@/components/ui/icons";

interface Invite {
  id: string; code: string; label: string;
  maxUses: number; usedCount: number;
  quotaPerUser: number | null; expiresAt: number | null;
  active: boolean; createdAt: number;
}

export function InviteTab() {
  const { data, loading, reload } = useJson<{ invites: Invite[] }>("/api/admin/invites");
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("0");
  const [quota, setQuota] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function create() {
    setBusy(true);
    await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        maxUses: Number(maxUses) || 0,
        quotaPerUser: quota ? Number(quota) : null,
        expiresInDays: days ? Number(days) : null,
      }),
    });
    setLabel("");
    setBusy(false);
    reload();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    reload();
  }

  async function copy(code: string) {
    const url = `${origin}/i/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(code);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      prompt("复制这个链接：", url);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card-soft p-4">
        <h2 className="font-cute text-ink-900 mb-1 text-base">新建邀请链接</h2>
        <p className="text-ink-400 mb-3 text-[11px]">
          发到群里或做成二维码贴在摊位上。不同场景建议分开发，方便回头看是哪一批人来的。
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="text-ink-600 text-[11px]">用途备注</span>
            <input className="input mt-1" placeholder="例如：秋季招新 / CP29 摊位"
              value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label>
            <span className="text-ink-600 text-[11px]">可用人数（0=不限）</span>
            <input className="input mt-1" inputMode="numeric" value={maxUses}
              onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label>
            <span className="text-ink-600 text-[11px]">每人张数（空=默认）</span>
            <input className="input mt-1" inputMode="numeric" placeholder="默认" value={quota}
              onChange={(e) => setQuota(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label>
            <span className="text-ink-600 text-[11px]">有效天数（空=永久）</span>
            <input className="input mt-1" inputMode="numeric" placeholder="永久" value={days}
              onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
          </label>
          <div className="flex items-end sm:col-span-3">
            <button onClick={create} disabled={busy} className="btn btn-primary w-full py-2.5 text-sm">
              生成链接
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="text-ink-400 py-8 text-center text-sm">加载中…</p>}

      <div className="space-y-2">
        {data?.invites.map((i) => {
          const expired = i.expiresAt != null && i.expiresAt < Date.now();
          const full = i.maxUses > 0 && i.usedCount >= i.maxUses;
          const dead = !i.active || expired || full;
          return (
            <div key={i.id} className={`card-soft p-3 ${dead ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-900 text-sm font-semibold">{i.label || "未命名"}</span>
                {dead && (
                  <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[10px] text-white">
                    {!i.active ? "已停用" : expired ? "已过期" : "名额已满"}
                  </span>
                )}
                <div className="flex-1" />
                <button onClick={() => copy(i.code)} className="btn btn-ghost px-3 py-1.5 text-[11px]">
                  {copied === i.code ? <><Icon name="check" size={13} />已复制</> : "复制链接"}
                </button>
                <button
                  onClick={() => patch(i.id, { active: !i.active })}
                  className="btn btn-ghost px-3 py-1.5 text-[11px]"
                >
                  {i.active ? "停用" : "启用"}
                </button>
              </div>
              <code className="text-sakura-600 mt-1.5 block break-all font-mono text-[11px]">
                {origin}/i/{i.code}
              </code>
              <p className="text-ink-400 mt-1 text-[11px]">
                已用 {i.usedCount}{i.maxUses > 0 ? ` / ${i.maxUses}` : " 人（不限）"}
                {" · "}每人 {i.quotaPerUser ?? "默认"} 张
                {i.expiresAt ? ` · ${new Date(i.expiresAt).toLocaleDateString("zh-CN")} 到期` : " · 永久有效"}
              </p>
            </div>
          );
        })}
        {data?.invites.length === 0 && (
          <p className="text-ink-400 py-10 text-center text-sm">
            还没有邀请链接。先建一个，米娜才能进来。
          </p>
        )}
      </div>
    </div>
  );
}
