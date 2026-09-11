/**
 * 进程内限流。单机部署够用；将来多实例要换成 Redis。
 */
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < t) {
    buckets.set(key, { n: 1, reset: t + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (b.n >= max) return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - t) / 1000) };
  b.n++;
  return { ok: true, remaining: max - b.n };
}

export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** 定期清掉过期桶，避免长跑进程内存缓慢增长 */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const t = Date.now();
    for (const [k, v] of buckets) if (v.reset < t) buckets.delete(k);
  }, 60_000);
  timer.unref?.();
}
