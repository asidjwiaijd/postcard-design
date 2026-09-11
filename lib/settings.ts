/**
 * 把后台改过的配置落到 settings 表，并推进 lib/config.ts 的活对象里。
 * 只在服务端使用（依赖 node:sqlite）。
 *
 * 表里只存「被改过」的字段，没存的走环境变量默认值，
 * 所以删掉一行就等于恢复该项默认。
 */
import { all, run, tx } from "./db";
import {
  BASE_CONFIG,
  applyConfig,
  snapshotConfig,
  type AppConfig,
} from "./config";
import { FIELDS, validateConfig } from "./configFields";

interface Row {
  key: string;
  value: string;
}

// 载入状态也得挂全局：每条路由的 bundle 各有一份模块实例
declare global {
  // eslint-disable-next-line no-var
  var __pcConfigLoaded: boolean | undefined;
}

const clone = (c: AppConfig): AppConfig => ({
  card: { ...c.card },
  limits: { ...c.limits },
  site: { ...c.site },
});

/** 读数据库里的覆盖项，叠在环境变量默认值上 */
function readMerged(): AppConfig {
  const merged = clone(BASE_CONFIG);
  const known = new Set(FIELDS.map((f) => f.path));
  for (const r of all<Row>(`SELECT key, value FROM settings`)) {
    if (!known.has(r.key)) continue; // 旧版本留下的字段，忽略
    const [g, k] = r.key.split(".");
    try {
      (merged as unknown as Record<string, Record<string, unknown>>)[g][k] = JSON.parse(r.value);
    } catch {
      /* 坏数据就当没设过 */
    }
  }
  // 过一遍校验，挡住手改数据库或旧版本留下的越界值
  const v = validateConfig(merged, BASE_CONFIG);
  return v.ok ? v.value : clone(BASE_CONFIG);
}

/** 从数据库重新载入并生效。进程内的 SPEC/LIMITS/SITE 会就地更新 */
export function reloadConfig(): AppConfig {
  applyConfig(readMerged());
  globalThis.__pcConfigLoaded = true;
  return snapshotConfig();
}

/** 每个用到配置的服务端入口都调一下；已载入时几乎零开销 */
export function ensureConfig(): AppConfig {
  if (!globalThis.__pcConfigLoaded) reloadConfig();
  return snapshotConfig();
}

/** 保存后台提交的整份配置。返回生效后的值 */
export function saveConfig(input: unknown): { ok: true; value: AppConfig } | { ok: false; error: string } {
  ensureConfig();
  const v = validateConfig(input, snapshotConfig());
  if (!v.ok) return v;

  const now = Date.now();
  tx(() => {
    for (const f of FIELDS) {
      const [g, k] = f.path.split(".");
      const cur = (v.value as unknown as Record<string, Record<string, unknown>>)[g][k];
      const base = (BASE_CONFIG as unknown as Record<string, Record<string, unknown>>)[g][k];
      if (cur === base) {
        // 和默认值一样就不占一行，方便 .env 之后再调默认
        run(`DELETE FROM settings WHERE key = ?`, f.path);
      } else {
        run(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          f.path,
          JSON.stringify(cur),
          now,
        );
      }
    }
  });
  return { ok: true, value: reloadConfig() };
}

/** 清空所有覆盖，回到 .env 的默认值 */
export function resetConfig(): AppConfig {
  run(`DELETE FROM settings`);
  return reloadConfig();
}
