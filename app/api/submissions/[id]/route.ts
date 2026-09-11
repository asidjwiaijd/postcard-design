import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getSubmission } from "@/lib/repo";
import { ensureConfig } from "@/lib/settings";

/** 取回自己某张已提交作品的设计数据，用于「在旧稿基础上再做一张」 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const sub = getSubmission(id);
  // 不是自己的稿子一律当作不存在，免得靠 id 试探别人的设计
  if (!sub || sub.user_id !== c.user.id) {
    return NextResponse.json({ error: "找不到这张作品" }, { status: 404 });
  }
  try {
    return NextResponse.json({ doc: JSON.parse(sub.design_json) });
  } catch {
    return NextResponse.json({ error: "这张作品的数据已经损坏" }, { status: 422 });
  }
}
