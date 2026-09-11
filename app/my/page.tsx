import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, publicUser } from "@/lib/auth";
import { listUserSubmissions } from "@/lib/repo";
import { SITE, SPEC } from "@/lib/config";
import { LogoutButton } from "./LogoutButton";
import { ensureConfig } from "@/lib/settings";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string; hint: string }> = {
  pending: { label: "待审核", cls: "bg-cream-100 text-amber-700 ring-amber-200", hint: "社团还没看到，或者正在看" },
  approved: { label: "已通过", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", hint: "会进印刷清单" },
  rejected: { label: "未通过", cls: "bg-rose-50 text-rose-600 ring-rose-200", hint: "看看下面的说明，改完可以再交" },
};

/** 后台可以设成「审核通过后才放图」，那之前连预览都不给 */
const visible = (status: string) => SITE.downloadBeforeReview || status === "approved";

export default async function MyPage() {
  ensureConfig();
  const me = await currentUser();
  if (!me) redirect("/");
  const u = publicUser(me);
  const subs = listUserSubmissions(me.user.id);

  return (
    <main className="bg-dreamy min-h-dvh">
      <header className="border-sakura-100 sticky top-0 z-10 flex items-center gap-3 border-b bg-white/85 px-4 py-3 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u.avatar} alt="" className="border-sakura-200 h-9 w-9 rounded-full border-2 object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-ink-900 truncate text-sm font-semibold">{u.nickname}</div>
          <div className="text-ink-400 font-mono text-[11px]">QQ {u.qq}</div>
        </div>
        <Link href="/editor" className="btn btn-primary px-4 py-2 text-xs">
          去设计
        </Link>
        <LogoutButton />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="card-soft mb-5 flex items-center justify-between p-4">
          <div>
            <div className="font-cute text-ink-900 text-lg">我的明信片</div>
            <div className="text-ink-400 mt-0.5 text-xs">
              已提交 {u.used} / {u.quota} 张
              {u.used >= u.quota && " · 名额用完了，想再做找管理员加"}
            </div>
          </div>
          <Icon name="mail" size={28} className="text-sakura-400" />
        </div>

        {subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sakura-300 bg-white/70 p-10 text-center">
            <Icon name="palette" size={28} className="text-sakura-300 mx-auto" />
            <p className="text-ink-600 mt-2 text-sm">还没有提交过</p>
            <Link href="/editor" className="btn btn-primary mt-4 px-5 py-2 text-sm">
              开始设计第一张
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((s) => {
              const st = STATUS[s.status] ?? STATUS.pending;
              return (
                <div key={s.id} className="card-soft overflow-hidden p-4">
                  <div className="flex items-start gap-4">
                    <div className="grid shrink-0 grid-cols-2 gap-1.5">
                      {(["front", "back"] as const).map((f) =>
                        visible(s.status) ? (
                          <a
                            key={f}
                            href={`/api/media/${f === "front" ? s.front_key : s.back_key}`}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-[104px] overflow-hidden rounded-md ring-1 ring-black/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/media/${f === "front" ? s.front_key : s.back_key}`}
                              alt={f} className="bg-cream-100 aspect-[154/106] w-full object-contain"
                            />
                          </a>
                        ) : (
                          <div
                            key={f}
                            className="bg-cream-100 text-ink-400 flex aspect-[154/106] w-[104px] items-center justify-center rounded-md text-[10px] ring-1 ring-black/10"
                          >
                            审核中
                          </div>
                        ),
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-ink-900 truncate text-sm font-semibold">
                          {s.title || `第 ${subs.length - subs.indexOf(s)} 张`}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="text-ink-400 mt-1 text-[11px]">
                        {new Date(s.created_at).toLocaleString("zh-CN")}
                        {" · 正面 "}{(s.front_bytes / 1048576).toFixed(2)}MB
                        {" · 反面 "}{(s.back_bytes / 1048576).toFixed(2)}MB
                      </p>
                      <p className="text-ink-400 mt-1 text-[11px]">{st.hint}</p>
                      {s.review_note && (
                        <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-600">
                          社团留言：{s.review_note}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {visible(s.status) ? (
                          (["front", "back"] as const).map((f) => (
                            <a
                              key={f}
                              href={`/api/media/${f === "front" ? s.front_key : s.back_key}`}
                              download={`明信片-${f === "front" ? "正面" : "反面"}-${s.id}.webp`}
                              className="btn btn-ghost px-3 py-1.5 text-[11px]"
                            >
                              <Icon name="download" size={13} />下载{f === "front" ? "正面" : "反面"}
                            </a>
                          ))
                        ) : (
                          <span className="text-ink-400 text-[11px]">
                            社团开启了「审核后才能下载」，通过之后这里会出现下载按钮
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-ink-400 mt-8 text-center text-[11px]">
          {SITE.clubName} · 印刷时会按 {SPEC.widthMm}×{SPEC.heightMm}mm 裁切，边缘的出血部分会被切掉
        </p>
      </div>
    </main>
  );
}
