import { NextRequest } from "next/server";
import { storage } from "@/lib/storage";
import { fetchAvatar, isValidQQ } from "@/lib/qq";
import { processAvatar } from "@/lib/image";

/**
 * 头像代理。必须走同源，否则画布导出时会因跨域被污染而无法 toBlob。
 * 抓到的图缓存在本地，既省腾讯的请求也保证印刷时图还在。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ qq: string }> },
) {
  const { qq } = await params;
  if (!isValidQQ(qq)) return placeholder(qq);

  const key = `avatars/${qq}.webp`;
  if (await storage.exists(key)) {
    return new Response(await storage.stream(key), { headers: imgHeaders });
  }

  const raw = await fetchAvatar(qq);
  if (!raw) return placeholder(qq);

  try {
    const { buffer } = await processAvatar(raw);
    await storage.put(key, buffer);
    return new Response(new Uint8Array(buffer), { headers: imgHeaders });
  } catch {
    return placeholder(qq);
  }
}

const imgHeaders = {
  "Content-Type": "image/webp",
  "Cache-Control": "public, max-age=86400",
};

/** 抓不到头像时用号码生成一个稳定的渐变占位图，不要让画布出现空洞 */
function placeholder(qq: string) {
  let h = 0;
  for (const ch of qq) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h} 85% 78%)"/><stop offset="1" stop-color="hsl(${(h + 48) % 360} 80% 66%)"/>
    </linearGradient></defs>
    <rect width="64" height="64" fill="url(#g)"/>
    <circle cx="32" cy="25" r="11" fill="#fff" opacity="0.85"/>
    <path d="M10 62 C 12 46, 22 40, 32 40 C 42 40, 52 46, 54 62 Z" fill="#fff" opacity="0.85"/>
  </svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=600" },
  });
}
