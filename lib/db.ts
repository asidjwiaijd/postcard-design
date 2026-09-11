import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const g = globalThis as unknown as { __pcdb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(path.join(DATA_DIR, "app.db"));
  db.exec(SCHEMA);
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
