"use client";

import { useState } from "react";
import { useJson } from "./AdminApp";

interface U {
  id: string; qq: string; nickname: string; banned: boolean;
  quota: number; quotaOverride: number | null; submissions: number;
  avatar: string; createdAt: number; lastSeenAt: number;
}

export function UserTab() {
  const { data, loading, reload } = useJson<{ users: U[] }>("/api/admin/users");
  const [q, setQ] = useState("");

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    reload();
  }

  const users = (data?.users ?? []).filter(
    (u) => !q || u.qq.includes(q) || u.nickname.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <input
        className="input max-w-xs" placeholder="搜 QQ 号或昵称"
        value={q} onChange={(e) => setQ(e.target.value)}
      />
      {loading && <p className="text-ink-400 py-8 text-center text-sm">加载中…</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className={`card-soft flex flex-wrap items-center gap-3 p-3 ${u.banned ? "opacity-55" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qq/avatar/${u.qq}`} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className="text-ink-900 truncate text-sm font-medium">
                {u.nickname}
                {u.banned && <span className="ml-2 text-[10px] text-rose-500">已停用</span>}
              </div>
              <div className="text-ink-400 font-mono text-[11px]">QQ {u.qq}</div>
            </div>
            <div className="text-ink-600 shrink-0 text-xs">
              {u.submissions} / {u.quota} 张
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => {
                  const v = prompt(`给 ${u.nickname} 单独设置张数上限（留空恢复默认）`, String(u.quotaOverride ?? ""));
                  if (v === null) return;
                  patch(u.id, { quotaOverride: v.trim() === "" ? null : Number(v) });
                }}
                className="btn btn-ghost px-2.5 py-1.5 text-[11px]"
              >
                改额度
              </button>
              <button
                onClick={() => patch(u.id, { banned: !u.banned })}
                className="btn btn-ghost px-2.5 py-1.5 text-[11px]"
              >
                {u.banned ? "恢复" : "停用"}
              </button>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <p className="text-ink-400 py-10 text-center text-sm">没有匹配的用户</p>
        )}
      </div>
    </div>
  );
}
