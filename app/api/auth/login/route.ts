import { NextRequest, NextResponse } from "next/server";
import { checkInvite, upsertUser, getUserByQQ, quotaFor, countSubmissions } from "@/lib/repo";
import { isValidQQ, fetchNickname, fetchAvatar } from "@/lib/qq";
import { setUserSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { processAvatar } from "@/lib/image";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`login:${clientIp(req)}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "尝试太频繁，请稍后" }, { status: 429 });

  const { code, qq, nickname } = (await req.json().catch(() => ({}))) as {
    code?: string; qq?: string; nickname?: string;
  };

  if (!qq || !isValidQQ(qq)) {
    return NextResponse.json({ error: "QQ 号格式不对" }, { status: 400 });
  }

  const existing = getUserByQQ(qq);
  if (existing?.banned) {
    return NextResponse.json({ error: "这个账号已被停用" }, { status: 403 });
  }

  // 老用户带着有效会话回来时不必再验邀请码；新用户必须凭邀请链接进入
  let inviteId = existing?.invite_id ?? null;
  if (!existing) {
    if (!code) return NextResponse.json({ error: "需要邀请链接才能进入" }, { status: 403 });
    const chk = checkInvite(code);
    if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 403 });
    inviteId = chk.invite.id;
  } else if (code) {
    const chk = checkInvite(code);
    if (chk.ok) inviteId = chk.invite.id;
  }

  const nick =
    (nickname || "").trim().slice(0, 24) ||
    existing?.nickname ||
    (await fetchNickname(qq)) ||
    `QQ${qq.slice(-4)}`;

  // 顺手把头像落到本地，之后画布和印刷都用本地这份
  let avatarKey: string | null = existing?.avatar_key ?? null;
  if (!avatarKey) {
    const raw = await fetchAvatar(qq);
    if (raw) {
      try {
        const { buffer } = await processAvatar(raw);
        avatarKey = `avatars/${qq}.webp`;
        await storage.put(avatarKey, buffer);
      } catch {
        avatarKey = null;
      }
    }
  }

  const { user } = upsertUser({ qq, nickname: nick, avatarKey, inviteId: inviteId! });
  await setUserSession(user.id, inviteId);

  return NextResponse.json({
    user: {
      id: user.id, qq: user.qq, nickname: user.nickname,
      avatar: `/api/qq/avatar/${user.qq}`,
      quota: quotaFor(user), used: countSubmissions(user.id),
    },
  });
}
