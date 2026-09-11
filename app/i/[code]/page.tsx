import Link from "next/link";
import { checkInvite } from "@/lib/repo";
import { SITE, SPEC, LIMITS } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { ensureConfig } from "@/lib/settings";
import { Icon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  ensureConfig();
  const { code } = await params;
  const chk = checkInvite(code);
  const me = await currentUser();

  if (!chk.ok) {
    return (
      <main className="bg-dreamy grid min-h-dvh place-items-center px-5">
        <div className="card-soft max-w-sm p-7 text-center">
          <Icon name="alert" size={34} className="text-sakura-400 mx-auto" />
          <h1 className="font-cute text-ink-900 mt-3 text-xl">进不去</h1>
          <p className="text-ink-600 mt-2 text-sm">{chk.reason}</p>
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2 text-sm">
            回首页
          </Link>
        </div>
      </main>
    );
  }

  const quota = chk.invite.quota_per_user ?? LIMITS.submissionsPerUser;

  return (
    <main className="bg-dreamy bg-dots relative min-h-dvh">
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
        <p className="font-cute text-sakura-500 text-sm tracking-widest">{SITE.clubName}</p>
        <h1 className="font-cute text-ink-900 mt-1 text-3xl">
          {chk.invite.label || "欢迎来做明信片"}
        </h1>
        <p className="text-ink-600 mt-2 text-sm">
          输入 QQ 号就能开始，不用密码。你最多可以提交 <b className="text-sakura-600">{quota}</b> 张。
        </p>
        <LoginForm code={code} alreadyIn={!!me} />
        <div className="border-sakura-200 mt-6 rounded-2xl border border-dashed bg-white/70 p-3.5">
          <p className="text-ink-600 flex items-center gap-1.5 text-xs font-semibold">
            <Icon name="alert" size={14} className="text-sakura-500" />
            交稿之前先知道这几条
          </p>
          <ul className="text-ink-400 mt-2 space-y-1 text-[11px] leading-relaxed">
            <li>· 画面里的图必须是你有权使用的（自己画的、买过授权的、作者允许印的）。</li>
            <li>· 不要涉黄涉暴、政治敏感、人身攻击或引流广告——这是要印出来现场发的。</li>
            <li>· 别把手机号、住址、别人的照片放上去。</li>
            <li>· 边缘 {SPEC.bleedMm}mm 是出血会被裁掉，重要内容往里放。进去之后还会细讲一遍。</li>
          </ul>
        </div>
        <p className="text-ink-400 mt-4 text-center text-xs leading-relaxed">
          我们只用 QQ 号识别你、抓取头像和昵称，不会拿它做别的事。
        </p>
      </div>
    </main>
  );
}
