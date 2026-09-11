/**
 * 存储适配器。当前实现落在本地磁盘（DATA_DIR），
 * 以后要换 S3/R2/OSS 只需另写一个满足 Storage 接口的实现并在 storage 处切换。
 */
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { DATA_DIR } from "./db";

export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  stream(key: string): Promise<ReadableStream<Uint8Array>>;
  del(key: string): Promise<void>;
  size(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
}

const ROOT = path.join(DATA_DIR, "files");

/** 阻断 ../ 之类的路径穿越 */
function resolveKey(key: string): string {
  const clean = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const full = path.resolve(ROOT, clean);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    throw new Error("invalid storage key");
  }
  return full;
}

class LocalStorage implements Storage {
  async put(key: string, data: Buffer) {
    const full = resolveKey(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }
  async get(key: string) {
    return fs.readFile(resolveKey(key));
  }
  async stream(key: string) {
    const full = resolveKey(key);
    await fs.access(full);
    return Readable.toWeb(
      createReadStream(full),
    ) as unknown as ReadableStream<Uint8Array>;
  }
  async del(key: string) {
    await fs.rm(resolveKey(key), { force: true });
  }
  async size(key: string) {
    return (await fs.stat(resolveKey(key))).size;
  }
  async exists(key: string) {
    try {
      await fs.access(resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }
}

export const storage: Storage = new LocalStorage();

/** 把 id 打散成两级目录，避免单目录塞进上万个文件 */
export function shardKey(prefix: string, id: string, ext: string) {
  return `${prefix}/${id.slice(0, 2)}/${id.slice(2, 4)}/${id}.${ext}`;
}
