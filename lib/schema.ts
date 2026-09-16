/**
 * 建表语句。内联成字符串而不是读 .sql 文件：
 * Next 的 standalone 产物只包含被追踪到的代码，运行时去读文件会找不到。
 * 全部语句都是 IF NOT EXISTS，每次启动执行一遍即可当作迁移。
 */
export const SCHEMA = `PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS invites (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  label          TEXT NOT NULL DEFAULT '',
  max_uses       INTEGER NOT NULL DEFAULT 0,   -- 0 = 不限
  used_count     INTEGER NOT NULL DEFAULT 0,
  quota_per_user INTEGER,                      -- NULL = 用全局默认
  expires_at     INTEGER,                      -- epoch ms, NULL = 不过期
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  qq             TEXT NOT NULL UNIQUE,
  nickname       TEXT NOT NULL DEFAULT '',
  avatar_key     TEXT,
  invite_id      TEXT REFERENCES invites(id),
  quota_override INTEGER,
  banned         INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER NOT NULL,
  last_seen_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,               -- 'upload' | 'sticker'
  category   TEXT NOT NULL DEFAULT '',    -- 贴纸分组
  name       TEXT NOT NULL DEFAULT '',
  storage_key TEXT NOT NULL,
  mime       TEXT NOT NULL,
  width      INTEGER NOT NULL,
  height     INTEGER NOT NULL,
  bytes      INTEGER NOT NULL,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind, category, sort);

CREATE TABLE IF NOT EXISTS submissions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_id   TEXT REFERENCES invites(id),
  title       TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',   -- 用户给社团的留言
  design_json TEXT NOT NULL,
  front_key   TEXT NOT NULL,
  back_key    TEXT NOT NULL,
  thumb_key   TEXT NOT NULL DEFAULT '',
  front_bytes INTEGER NOT NULL DEFAULT 0,
  back_bytes  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_at INTEGER,
  printed     INTEGER NOT NULL DEFAULT 0,
  copies      INTEGER NOT NULL DEFAULT 1,   -- 这一张印几份，后台改
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sub_user ON submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_status ON submissions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS drafts (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  design_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 未提交的设计稿。早期一个人只存一份（上面的 drafts），
-- 现在一人可以留多份，新建之后还能回到之前那张。drafts 里的旧数据
-- 会在第一次列出文档时搬过来（见 lib/repo.ts 的 migrateLegacyDraft）。
CREATE TABLE IF NOT EXISTS docs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  design_json TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docs_user ON docs(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,          -- 点号路径，如 card.widthMm
  value      TEXT NOT NULL,             -- JSON 编码的值
  updated_at INTEGER NOT NULL
);
`;
