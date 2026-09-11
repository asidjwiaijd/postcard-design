import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me",
);

export const USER_COOKIE = "pc_session";
export const ADMIN_COOKIE = "pc_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(SECRET);
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as T;
  } catch {
    return null;
  }
}

/**
 * Secure 必须按「浏览器这次到底是不是 https」来定，不能用 NODE_ENV 判断：
 * 用 http 访问时浏览器会把带 Secure 的 cookie 直接丢掉，
 * 表现就是登录接口返回 200、页面却一直停在登录框。
 *
 * 判断顺序：
 *   1. COOKIE_SECURE 环境变量，设了就听它的；
 *   2. 浏览器自己带的 Origin / Referer —— 这是唯一由浏览器写、CDN 不会改的证据。
 *      腾讯云 EdgeOne 这类 CDN 不管客户端用 http 还是 https，回源一律写
 *      x-forwarded-proto: https，只信它就会给 http 访客发 Secure cookie，登不进去；
 *   3. 都没有（服务端自己调、curl）才退回 x-forwarded-proto。
 * cookie 只在 POST 接口里下发，浏览器发同源 POST 一定带 Origin，所以第 2 条基本都能命中。
 */
async function cookieOpts() {
  const forced = process.env.COOKIE_SECURE;
  let secure: boolean;
  if (forced) {
    secure = /^(1|true|yes|on)$/i.test(forced);
  } else {
    const h = await headers();
    const from = h.get("origin") || h.get("referer") || "";
    if (/^https:\/\//i.test(from)) secure = true;
    else if (/^http:\/\//i.test(from)) secure = false;
    else {
      const proto = h.get("x-forwarded-proto") ?? "";
      secure = proto.split(",")[0].trim().toLowerCase() === "https";
    }
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: MAX_AGE,
  };
}

export async function setUserSession(userId: string, inviteId: string | null) {
  const jar = await cookies();
  jar.set(USER_COOKIE, await sign({ uid: userId, inv: inviteId }), await cookieOpts());
}

export async function readUserSession() {
  const jar = await cookies();
  return verify<{ uid: string; inv: string | null }>(
    jar.get(USER_COOKIE)?.value,
  );
}

export async function clearUserSession() {
  (await cookies()).delete(USER_COOKIE);
}

export async function setAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, await sign({ role: "admin" }), await cookieOpts());
}

export async function isAdmin() {
  const jar = await cookies();
  const p = await verify<{ role: string }>(jar.get(ADMIN_COOKIE)?.value);
  return p?.role === "admin";
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
