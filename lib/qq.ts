import iconv from "iconv-lite";

export const AVATAR_URL = (qq: string, size = 640) =>
  `https://q.qlogo.cn/headimg_dl?dst_uin=${encodeURIComponent(qq)}&spec=${size}`;

export function isValidQQ(qq: string) {
  return /^[1-9][0-9]{4,11}$/.test(qq);
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms = 6000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await p(ac.signal);
  } finally {
    clearTimeout(t);
  }
}

/** 抓取 QQ 昵称。腾讯这个接口返回 GBK 编码的 JSONP，拿不到就返回 null。 */
export async function fetchNickname(qq: string): Promise<string | null> {
  try {
    const buf = await withTimeout(async (signal) => {
      const res = await fetch(
        `https://users.qzone.qq.com/fcg-bin/cgi_get_portrait.fcg?uins=${encodeURIComponent(qq)}`,
        { signal, headers: { Referer: "https://qzone.qq.com/" } },
      );
      if (!res.ok) throw new Error("bad status");
      return Buffer.from(await res.arrayBuffer());
    });
    const text = iconv.decode(buf, "gbk");
    const json = text.slice(text.indexOf("(") + 1, text.lastIndexOf(")"));
    const data = JSON.parse(json) as Record<string, unknown[]>;
    const nick = data[qq]?.[6];
    return typeof nick === "string" && nick.trim() ? nick.trim() : null;
  } catch {
    return null;
  }
}

/** 抓取头像原图字节。失败返回 null，由调用方降级。 */
export async function fetchAvatar(qq: string): Promise<Buffer | null> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(AVATAR_URL(qq), { signal });
      if (!res.ok) throw new Error("bad status");
      const buf = Buffer.from(await res.arrayBuffer());
      // 号码不存在时腾讯会返回一张极小的占位图
      if (buf.byteLength < 512) throw new Error("placeholder");
      return buf;
    });
  } catch {
    return null;
  }
}
