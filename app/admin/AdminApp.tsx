"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ReviewTab } from "./ReviewTab";
import { InviteTab } from "./InviteTab";
import { StickerTab } from "./StickerTab";
import { UserTab } from "./UserTab";
import { SettingTab } from "./SettingTab";
import { Icon } from "@/components/ui/icons";

const TABS = [
  { id: "review", label: "稿件审核", icon: "inbox" },
  { id: "invite", label: "邀请链接", icon: "link" },
  { id: "sticker", label: "社团素材", icon: "sparkles" },
  { id: "user", label: "用户", icon: "users" },
  { id: "setting", label: "设置", icon: "settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminApp() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("review");

  return (
    <main className="bg-dreamy min-h-dvh">
      <header className="border-sakura-100 sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="font-cute text-sakura-600 text-base">明信片后台</span>
          <nav className="thin-scroll -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  tab === t.id ? "bg-sakura-500 text-white" : "text-ink-500 hover:bg-sakura-50",
                )}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            ))}
          </nav>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              router.refresh();
            }}
            className="text-ink-400 hover:text-ink-800 shrink-0 text-xs underline"
          >
            退出
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5">
        {tab === "review" && <ReviewTab />}
        {tab === "invite" && <InviteTab />}
        {tab === "sticker" && <StickerTab />}
        {tab === "user" && <UserTab />}
        {tab === "setting" && <SettingTab />}
      </div>
    </main>
  );
}

/** 各标签页共用的轻量数据获取 */
export function useJson<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const seq = useRef(0);

  const reload = useCallback(() => {
    if (!url) return;
    const my = ++seq.current;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "加载失败");
        return d as T;
      })
      .then((d) => { if (my === seq.current) { setData(d); setErr(""); } })
      .catch((e) => { if (my === seq.current) setErr(e.message); })
      .finally(() => { if (my === seq.current) setLoading(false); });
  }, [url]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [url, ...deps]);
  return { data, loading, err, reload };
}
