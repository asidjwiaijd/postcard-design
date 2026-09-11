import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { ensureConfig, saveConfig, resetConfig } from "@/lib/settings";
import { BASE_CONFIG } from "@/lib/config";
import { submissionStats } from "@/lib/repo";

/** 已经有人交稿之后再改尺寸是有代价的，界面要据此提醒 */
const payload = (config: ReturnType<typeof ensureConfig>) => ({
  config,
  defaults: BASE_CONFIG,
  submissions: submissionStats().reduce((n, s) => n + s.n, 0),
});

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json(payload(ensureConfig()));
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const r = saveConfig(body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(payload(r.value));
}

/** 清掉所有覆盖，回到 .env / 代码默认值 */
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });
  return NextResponse.json(payload(resetConfig()));
}
