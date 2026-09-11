import { NextRequest, NextResponse } from "next/server";
import { passwordMatches, ADMIN_PASSWORD } from "@/lib/adminAuth";
import { setAdminSession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`admin:${clientIp(req)}`, 8, 300_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "尝试次数过多，5 分钟后再来" }, { status: 429 });
  }
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "服务端未设置 ADMIN_PASSWORD，无法登录后台" },
      { status: 500 },
    );
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !passwordMatches(password)) {
    return NextResponse.json({ error: "密码不对" }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
