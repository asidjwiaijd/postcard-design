import sharp from "sharp";
import { LIMITS, pageExportW, pageExportH } from "./config";

sharp.cache(false);
sharp.concurrency(2);

export interface Processed {
  buffer: Buffer;
  width: number;
  height: number;
  mime: string;
  ext: string;
}

/**
 * 在不超过目标体积的前提下取尽可能高的 webp 质量。
 * 先试最高画质，够小就直接用；超标了在 lo~hi 之间二分几轮。
 * 成品面和用户素材共用这一套，省得两处各写一遍二分。
 */
async function encodeUnderTarget(
  base: Buffer,
  targetBytes: number,
  opt: {
    hi?: number; lo?: number; effort?: number; alphaQuality?: number; smart?: boolean;
    /** 二分几轮。每一轮都要重编一次，大图上一轮就是一两秒 */
    rounds?: number;
  } = {},
): Promise<{ buffer: Buffer; quality: number }> {
  let lo = opt.lo ?? 35;
  let hi = opt.hi ?? 95;
  const encode = (q: number) =>
    sharp(base)
      .webp({
        quality: q,
        effort: opt.effort ?? 5,
        alphaQuality: opt.alphaQuality ?? 100,
        smartSubsample: opt.smart ?? true,
      })
      .toBuffer();

  const top = await encode(hi);
  if (top.byteLength <= targetBytes) return { buffer: top, quality: hi };

  let best: { buffer: Buffer; quality: number } | null = null;
  const floor = lo;
  // 体积大致随质量的平方走，先按超标倍数估一个起点，
  // 比闷头从区间中点开始少编一两次——大图上每编一次就是一两秒
  let probe = Math.min(
    hi - 1,
    Math.max(lo, Math.round(hi * Math.sqrt(targetBytes / top.byteLength))),
  );
  hi -= 1;
  for (let i = 0; i < (opt.rounds ?? 6) && lo <= hi; i++) {
    const buf = await encode(probe);
    if (buf.byteLength <= targetBytes) {
      best = { buffer: buf, quality: probe };
      lo = probe + 1;
    } else {
      hi = probe - 1;
    }
    probe = Math.floor((lo + hi) / 2);
  }
  // 极端情况（满版高频噪点）：最低质量仍超标，就接受它，别丢稿
  return best ?? { buffer: await encode(floor), quality: floor };
}

/**
 * 用户上传的素材图：转正、限长边、统一转 webp，并压到目标体积以内。
 * 印刷只吃得下 uploadMaxEdge 那么大的图，原图再清晰也是白占地方；
 * 一个人能传几十张，不压的话磁盘涨得比成品还快。
 */
export async function processUpload(input: Buffer): Promise<Processed & { quality: number }> {
  const img = sharp(input, { failOn: "none", limitInputPixels: 268402689 }).rotate();
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error("无法识别的图片");

  const max = LIMITS.uploadMaxEdge;
  const base = await (Math.max(meta.width, meta.height) > max
    ? img.resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    : img
  )
    .toColorspace("srgb")
    .toBuffer();

  // 这是用户点了上传之后干等的路径：effort 和二分轮数都压低一点，
  // 5MP 的图每编一次就一两秒，画质差别肉眼看不出来
  const { buffer, quality } = await encodeUnderTarget(base, LIMITS.uploadTargetBytes, {
    hi: 88,
    lo: 45,
    effort: 3,
    rounds: 3,
  });
  const out = await sharp(buffer).metadata();
  return {
    buffer,
    width: out.width ?? meta.width,
    height: out.height ?? meta.height,
    mime: "image/webp",
    ext: "webp",
    quality,
  };
}

/**
 * 成品面：强制对齐到印刷像素尺寸，然后二分 webp 质量，
 * 在不超过目标体积的前提下取尽可能高的画质。
 *
 * turned = 这一面是竖版（长短边对调）。对不上会被 fit:"fill" 拉成一张扁的，
 * 所以提交接口必须照实传。
 */
export async function compressRender(
  input: Buffer,
  targetBytes = LIMITS.renderTargetBytes,
  turned = false,
): Promise<Processed & { quality: number }> {
  const W = pageExportW(turned);
  const H = pageExportH(turned);
  const base = await sharp(input, { failOn: "none" })
    .resize(W, H, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .toColorspace("srgb")
    .toBuffer();

  const best = await encodeUnderTarget(base, targetBytes);

  return {
    buffer: best.buffer,
    width: W,
    height: H,
    mime: "image/webp",
    ext: "webp",
    quality: best.quality,
  };
}

/** 后台列表用的小图 */
export async function makeThumb(input: Buffer, width = 560): Promise<Processed> {
  const buffer = await sharp(input, { failOn: "none" })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();
  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    width: meta.width ?? width,
    height: meta.height ?? 0,
    mime: "image/webp",
    ext: "webp",
  };
}

/** 头像：裁成方图存本地，避免画布跨域污染 */
export async function processAvatar(input: Buffer): Promise<Processed> {
  const buffer = await sharp(input, { failOn: "none" })
    .resize(640, 640, { fit: "cover" })
    .webp({ quality: 86 })
    .toBuffer();
  return { buffer, width: 640, height: 640, mime: "image/webp", ext: "webp" };
}
