"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Found {
  qq: string;
  nickname: string;
  /** true = 没抓到昵称，需要用户自己填 */
  guessed: boolean;
  avatar: string;
}

export function LoginForm({ code, alreadyIn }: { code: string; alreadyIn: boolean }) {
  const router = useRouter();
  const [qq, setQq] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[1-9][0-9]{4,11}$/.test(qq)) {
      setErr("QQ 号看起来不太对");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qq }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "查不到");
      setFound(d);
      setNickname(d.nickname);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "网络不太好");
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, qq, nickname }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "登录失败");
      router.push("/editor");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "网络不太好");
      setBusy(false);
    }
  }

  if (alreadyIn) {
    return (
      <div className="card-soft mt-7 p-5 text-center">
        <p className="text-ink-600 text-sm">你已经登录过了</p>
        <button onClick={() => router.push("/editor")} className="btn btn-primary mt-3 w-full py-2.5">
          继续做明信片
        </button>
      </div>
    );
  }

  return (
    <div className="card-soft mt-7 p-5">
      {!found ? (
        <form onSubmit={lookup} className="space-y-3">
          <label className="text-ink-600 block text-sm font-medium">你的 QQ 号</label>
          <input
            className="input font-mono text-lg tracking-wider"
            inputMode="numeric"
            autoComplete="off"
            placeholder="10001"
            value={qq}
            onChange={(e) => setQq(e.target.value.replace(/\D/g, "").slice(0, 12))}
          />
          <button className="btn btn-primary w-full py-2.5" disabled={busy || qq.length < 5}>
            {busy ? "查一下…" : "下一步"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={found.avatar}
              alt=""
              className="border-sakura-200 h-14 w-14 rounded-full border-2 object-cover"
            />
            <div className="min-w-0 flex-1">
              <input
                className="input py-1.5 text-sm"
                value={nickname}
                maxLength={24}
                autoFocus={found.guessed}
                placeholder="怎么称呼你？"
                onChange={(e) => setNickname(e.target.value)}
              />
              <p className="text-ink-400 mt-1 font-mono text-xs">QQ {found.qq}</p>
            </div>
          </div>
          <p className="text-ink-400 text-xs">
            {found.guessed
              ? "头像找到了，昵称得你自己填——这个名字会印在明信片的模板上。"
              : "是你吗？昵称可以改成你想显示的名字。"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setFound(null); setErr(""); }}
              className="btn btn-ghost flex-1 py-2.5"
              disabled={busy}
            >
              不是我
            </button>
            <button onClick={login} className="btn btn-primary flex-[2] py-2.5" disabled={busy || !nickname.trim()}>
              {busy ? "进去中…" : "就是我，开始设计"}
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-rose-500">{err}</p>}
    </div>
  );
}
