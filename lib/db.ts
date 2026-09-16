import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const g = globalThis as unknown as { __pcdb?: DatabaseSync };

/**
 * 后加的列。建表语句全是 IF NOT EXISTS，对已经存在的库一点用都没有，
 * 新字段得单独补上。SQLite 没有 ADD COLUMN IF NOT EXISTS，只能先问一遍表结构。
 * 加完的列必须有默认值，老数据才填得上。
 */
const ADDED_COLUMNS: [table: string, column: string, decl: string][] = [
  ["submissions", "copies", "INTEGER NOT NULL DEFAULT 1"],
];

function migrate(db: DatabaseSync) {
  for (const [table, column, decl] of ADDED_COLUMNS) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.length || cols.some((c) => c.name === column)) continue;
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
    } catch (e) {
      // 只读地打开库的场合（构建期的脚本、挂错权限的卷）不该直接崩在启动上，
      // 但列真的没加上去后面一定会出错，所以喊一声
      console.error(`[db] 给 ${table} 加列 ${column} 失败：`, e);
    }
  }
}

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "app.db"));
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!g.__pcdb) g.__pcdb = open();
  return g.__pcdb;
}

type Row = Record<string, unknown>;

/** 查询多行 */
export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return getDb()
    .prepare(sql)
    .all(...(params as never[])) as T[];
}

/** 查询单行 */
export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  return getDb()
    .prepare(sql)
    .get(...(params as never[])) as T | undefined;
}

/** 执行写入 */
export function run(sql: string, ...params: unknown[]) {
  return getDb()
    .prepare(sql)
    .run(...(params as never[]));
}

/** 在一个事务里执行 */
export function tx<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export const now = () => Date.now();
