import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createSubmission, listUserSubmissions } from "@/lib/repo";
import { compressRender, makeThumb } from "@/lib/image";
import { storage, shardKey } from "@/lib/storage";
import { LIMITS } from "@/lib/config";
import { rateLimit } from "@/lib/ratelimit";
import { nanoid } from "nanoid";
import { ensureConfig } from "@/lib/settings";
import { campaignFullMsg, campaignStatus } from "@/lib/campaign";

export const maxDuration = 120;

export async function GET() {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({
    submissions: listUserSubmissions(c.user.id).map(publicSub),
    quota: c.quota,
    used: c.used,
    campaign: campaignStatus(),
  });
}

export async function POST(req: NextRequest) {
  ensureConfig();
  const c = await currentUser();
  if (!c) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const rl = rateLimit(`submit:${c.user.id}`, 6, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "提交太频繁了，缓一分钟" }, { status: 429 });

  if (c.used >= c.quota) {
    return NextResponse.json(
      { error: `你的名额是 ${c.quota} 张，已经用完啦` },
      { status: 403 },
    );
  }
  const cam = campaignStatus();
  if (cam.full) {
    return NextResponse.json({ error: campaignFullMsg(cam.cap) }, { status: 403 });
  }

  const form = await req.formData();
  const front = form.get("front");
  const back = form.get("back");
  const docRaw = String(form.get("doc") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 60);
  const note = String(form.get("note") ?? "").trim().slice(0, 500);

  if (!(front instanceof File) || !(back instanceof File)) {
    return NextResponse.json({ error: "缺少正面或反面图" }, { status: 400 });
  }
  if (front.size > LIMITS.renderUploadMaxBytes || back.size > LIMITS.renderUploadMaxBytes) {
    return NextResponse.json({ error: "渲染结果过大，请减少画面上的大图" }, { status: 413 });
  }
  let turned = { front: false, back: false };
  try {
    const parsed = JSON.parse(docRaw) as { front?: { turned?: boolean }; back?: { turned?: boolean } };
    // 竖版那一面的画幅是转过来的，压图时要照实缩放，不然会被拉扁
    turned = { front: !!parsed?.front?.turned, back: !!parsed?.back?.turned };
  } catch {
    return NextResponse.json({ error: "设计数据损坏" }, { status: 400 });
  }

  const id = nanoid(14);
  try {
    const [f, b] = await Promise.all([
      compressRender(Buffer.from(await front.arrayBuffer()), LIMITS.renderTargetBytes, turned.front),
      compressRender(Buffer.from(await back.arrayBuffer()), LIMITS.renderTargetBytes, turned.back),
    ]);
    const thumb = await makeThumb(f.buffer);

    // 压图要好几秒，这期间别人可能刚好把最后一个名额占掉，落盘前再看一眼
    const again = campaignStatus();
    if (again.full) {
      return NextResponse.json({ error: campaignFullMsg(again.cap) }, { status: 403 });
    }

    const frontKey = shardKey("renders", id + "f", "webp");
    const backKey = shardKey("renders", id + "b", "webp");
    const thumbKey = shardKey("thumbs", id, "webp");
    await Promise.all([
      storage.put(frontKey, f.buffer),
      storage.put(backKey, b.buffer),
      storage.put(thumbKey, thumb.buffer),
    ]);

    const sub = createSubmission({
      userId: c.user.id, inviteId: c.inviteId, title, note,
      designJson: docRaw, frontKey, backKey, thumbKey,
      frontBytes: f.buffer.byteLength, backBytes: b.buffer.byteLength,
    });

    return NextResponse.json({
      submission: publicSub(sub),
      quality: { front: f.quality, back: b.quality },
    });
  } catch (e) {
    console.error("submission failed", e);
    return NextResponse.json({ error: "服务器处理图片失败，请重试" }, { status: 500 });
  }
}

function publicSub(s: {
  id: string; title: string; note: string; status: string; review_note: string;
  front_key: string; back_key: string; thumb_key: string;
  front_bytes: number; back_bytes: number; created_at: number;
}) {
  return {
    id: s.id, title: s.title, note: s.note, status: s.status, reviewNote: s.review_note,
    front: `/api/media/${s.front_key}`, back: `/api/media/${s.back_key}`,
    thumb: `/api/media/${s.thumb_key}`,
    frontBytes: s.front_bytes, backBytes: s.back_bytes, createdAt: s.created_at,
  };
}
