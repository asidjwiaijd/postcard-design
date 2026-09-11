import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deleteDoc, getDoc, saveDoc } from "@/lib/repo";
import { ensureConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

const MAX_JSON = 2_000_000;

/** 打开一份旧稿 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  // 不是自己的稿子一律当作不存在
  const row = getDoc(id, c.user.id);
  if (!row) return NextResponse.json({ error: "找不到这份设计稿" }, { status: 404 });
  try {
    return NextResponse.json({ doc: JSON.parse(row.design_json), name: row.name });
  } catch {
    return NextResponse.json({ error: "这份稿子的数据已经损坏" }, { status: 422 });
  }
}

/** 自动保存 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await req.text();
  if (body.length > MAX_JSON) {
    return NextResponse.json({ error: "设计数据过大" }, { status: 413 });
  }
  try {
    JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "数据格式错误" }, { status: 400 });
  }
  // 稿子被自己在另一个标签页删掉了：让前端知道要重新建一份，别把它悄悄复活
  if (!saveDoc(id, c.user.id, body)) {
    return NextResponse.json({ error: "这份设计稿已经不在了" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  deleteDoc(id, c.user.id);
  return NextResponse.json({ ok: true });
}
