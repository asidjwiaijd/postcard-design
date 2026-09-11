import { NextRequest, NextResponse } from "next/server";
import { fetchNickname, isValidQQ } from "@/lib/qq";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { getUserByQQ } from "@/lib/repo";

/** 输入 QQ 号后拉昵称和头像，让用户确认「是不是你」 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`lookup:${clientIp(req)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "查得太快了，歇一会儿" }, { status: 429 });

  const { qq } = (await req.json().catch(() => ({}))) as { qq?: string };
  if (!qq || !isValidQQ(qq)) {
    return NextResponse.json({ error: "QQ 号格式不对" }, { status: 400 });
  }

  // 腾讯的昵称接口现在需要登录态，多半抓不到；抓不到就让用户自己填，
  // 别硬塞一个 QQ1234 之类的占位名进去。
  const known = getUserByQQ(qq);
  const nickname = known?.nickname || (await fetchNickname(qq)) || "";
  return NextResponse.json({
    qq,
    nickname,
    guessed: !nickname,
    avatar: `/api/qq/avatar/${qq}`,
  });
}
