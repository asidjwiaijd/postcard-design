import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { listSubmissions } from "@/lib/repo";
import { storage } from "@/lib/storage";
import { zipStream, type ZipSource } from "@/lib/zip";
import { SPEC, bleedW, bleedH, exportW, exportH, turnLabel } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";

export const maxDuration = 300;

/** 把某个状态下的所有稿件打包给印刷厂 */
export async function GET(req: NextRequest) {
  ensureConfig();
  if (!(await requireAdmin())) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") ?? "approved";
  const all = listSubmissions(status, 2000, 0);
  // 份数设成 0 的是「这次不印」，不进包也不进清单，省得印厂照着印
  const rows = all.filter((s) => s.copies > 0);
  if (!rows.length) return NextResponse.json({ error: "这个状态下没有要印的稿件" }, { status: 404 });
  const skipped = all.length - rows.length;
  const totalPrints = rows.reduce((n, s) => n + s.copies, 0);

  const safe = (s: string) => s.replace(/[^\w一-龥-]/g, "_").slice(0, 30);
  const sources: ZipSource[] = [];

  const manifest = [
    ["序号", "编号", "QQ", "昵称", "份数", "正面朝向", "反面朝向", "状态", "已印", "提交时间", "正面文件", "反面文件"].join(","),
  ];

  /** 稿子里记着每一面各自的朝向，印厂要据此决定哪一面转 90° */
  const turnOf = (json: string) => {
    try {
      const d = JSON.parse(json) as { front?: { turned?: boolean }; back?: { turned?: boolean } };
      return { f: turnLabel(!!d?.front?.turned), b: turnLabel(!!d?.back?.turned) };
    } catch {
      return { f: turnLabel(false), b: turnLabel(false) };
    }
  };
  let mixed = 0;

  rows.forEach((s, i) => {
    const n = String(i + 1).padStart(3, "0");
    // 份数写进文件夹名，印厂拼版的时候不用来回翻清单
    const base = `${n}_${safe(s.nickname || s.qq)}_${s.qq}${s.copies === 1 ? "" : `_x${s.copies}`}`;
    sources.push({ name: `${base}/正面.webp`, load: () => storage.get(s.front_key).then((b) => new Uint8Array(b)) });
    sources.push({ name: `${base}/反面.webp`, load: () => storage.get(s.back_key).then((b) => new Uint8Array(b)) });
    const t = turnOf(s.design_json);
    if (t.f !== t.b) mixed++;
    manifest.push(
      [
        n, s.id, s.qq, `"${(s.nickname || "").replace(/"/g, '""')}"`,
        s.copies, t.f, t.b, s.status, s.printed ? "是" : "否",
        new Date(s.created_at).toLocaleString("zh-CN"),
        `${base}/正面.webp`, `${base}/反面.webp`,
      ].join(","),
    );
  });

  const readme = `明信片印刷说明
================
成品尺寸  ${SPEC.widthMm} × ${SPEC.heightMm} mm
出血      四边各 ${SPEC.bleedMm} mm（文件已含出血）
含出血版  ${bleedW()} × ${bleedH()} mm
文件像素  ${exportW()} × ${exportH()} px @ ${SPEC.dpi}dpi
安全区    距成品边 ${SPEC.safeMm} mm，文字均在安全区内
色彩      sRGB，需要 CMYK 请由印厂统一转换
格式      WebP（每面 ≤ 3MB）

共 ${rows.length} 份稿件，合计要印 ${totalPrints} 张。
每份一个文件夹，含正面 / 反面各一张；文件夹名末尾的 _xN 表示这一张印 N 份，
没有后缀的印 1 份。份数也在 清单.csv 的「份数」列里（UTF-8 BOM，Excel 可直接打开）。${
  skipped ? `\n另有 ${skipped} 份被标为这次不印，没有放进这个包。` : ""
}

朝向    每一面可以各自选横版 / 竖版，竖版文件的长短边是对调的
        （${bleedH()} × ${bleedW()} mm）。清单里逐张标了朝向。${
  mixed ? `\n        其中 ${mixed} 份两面朝向不一致，拼版时把其中一面转 90°。` : ""
}
`;

  sources.push({ name: "清单.csv", load: async () => new TextEncoder().encode("﻿" + manifest.join("\n")) });
  sources.push({ name: "印刷说明.txt", load: async () => new TextEncoder().encode(readme) });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(zipStream(sources), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="postcards-${status}-${stamp}.zip"; filename*=UTF-8''postcards-${status}-${stamp}.zip`,
      "Cache-Control": "no-store",
    },
  });
}
