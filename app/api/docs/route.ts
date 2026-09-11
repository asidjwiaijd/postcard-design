import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createDoc, listDocs, MAX_DOCS } from "@/lib/repo";
import { ensureConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** 单份设计数据的大小上限，和编辑器自动保存那边保持一致 */
const MAX_JSON = 2_000_000;

/**
 * 列出自己没提交的设计稿。只回正面那一页——「新建」对话框里要拿它画缩略图，
 * 把二十份完整文档全发过去没必要。
 */
export async function GET() {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const docs = listDocs(c.user.id).map((d) => {
    let front: unknown = null;
    try {
      front = (JSON.parse(d.design_json) as { front?: unknown }).front ?? null;
    } catch {
      /* 坏掉的稿子照样列出来，只是没有缩略图 */
    }
    return { id: d.id, name: d.name, createdAt: d.created_at, updatedAt: d.updated_at, front };
  });
  return NextResponse.json({ docs, max: MAX_DOCS });
}

/** 新建一份。编辑器是在第一次自动保存时才建的，空白稿不会占位置 */
export async function POST(req: NextRequest) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { doc?: unknown; name?: string } | null;
  if (!body?.doc || typeof body.doc !== "object") {
    return NextResponse.json({ error: "数据格式错误" }, { status: 400 });
  }
  const json = JSON.stringify(body.doc);
  if (json.length > MAX_JSON) {
    return NextResponse.json({ error: "设计数据过大" }, { status: 413 });
  }
  const row = createDoc(c.user.id, json, typeof body.name === "string" ? body.name : "");
  return NextResponse.json({ id: row.id, updatedAt: row.updated_at });
}
