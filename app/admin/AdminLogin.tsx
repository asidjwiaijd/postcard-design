"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "登录失败");
      // 密码对了不等于登录成功：cookie 被浏览器丢掉的话这里还是未登录状态，
      // 再确认一次，免得页面刷回登录框却不给任何理由
      const check = await fetch("/api/admin/config", { cache: "no-store" });
      if (check.status === 401) {
        throw new Error(
          location.protocol === "http:"
            ? "密码是对的，但浏览器没保存会话——这个站在 http 下拿不到登录状态，请改用 https 打开。"
            : "密码是对的，但浏览器没保存会话。检查一下是不是禁用了 Cookie。",
        );
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "登录失败");
      setBusy(false);
    }
  }

  return (
    <main className="bg-dreamy grid min-h-dvh place-items-center px-5">
      <form onSubmit={go} className="card-soft w-full max-w-sm space-y-3 p-6">
        <Icon name="key" size={26} className="text-sakura-500 mx-auto" />
        <h1 className="font-cute text-ink-900 text-xl">管理后台</h1>
        {!configured ? (
          <p className="rounded-xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-600">
            服务端没有设置 <code className="font-mono">ADMIN_PASSWORD</code> 环境变量，
            后台无法登录。在 <code className="font-mono">.env</code> 里加上它再重启。
          </p>
        ) : (
          <>
            <input
              type="password" className="input" placeholder="管理员密码" autoFocus
              value={pw} onChange={(e) => setPw(e.target.value)}
            />
            <button className="btn btn-primary w-full py-2.5 text-sm" disabled={busy || !pw}>
              {busy ? "验证中…" : "进入"}
            </button>
          </>
        )}
        {err && <p className="text-xs text-rose-500">{err}</p>}
      </form>
    </main>
  );
}
