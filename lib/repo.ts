import { nanoid } from "nanoid";
import { all, get, run, now } from "./db";
import { LIMITS } from "./config";

export interface InviteRow {
  id: string; code: string; label: string;
  max_uses: number; used_count: number;
  quota_per_user: number | null; expires_at: number | null;
  active: number; created_at: number;
}
export interface UserRow {
  id: string; qq: string; nickname: string; avatar_key: string | null;
  invite_id: string | null; quota_override: number | null;
  banned: number; created_at: number; last_seen_at: number;
}
export interface AssetRow {
  id: string; owner_id: string | null; kind: string; category: string;
  name: string; storage_key: string; mime: string;
  width: number; height: number; bytes: number; sort: number; created_at: number;
}
export interface SubmissionRow {
  id: string; user_id: string; invite_id: string | null;
  title: string; note: string; design_json: string;
  front_key: string; back_key: string; thumb_key: string;
  front_bytes: number; back_bytes: number;
  status: string; review_note: string; reviewed_at: number | null;
  printed: number; copies: number; created_at: number; updated_at: number;
}

// ---------------------------------------------------------------- 邀请

export function createInvite(input: {
  label?: string; maxUses?: number; quotaPerUser?: number | null; expiresAt?: number | null;
}): InviteRow {
  const id = nanoid(12);
  const code = nanoid(10);
  run(
    `INSERT INTO invites (id, code, label, max_uses, used_count, quota_per_user, expires_at, active, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?)`,
    id, code, input.label ?? "", input.maxUses ?? 0,
    input.quotaPerUser ?? null, input.expiresAt ?? null, now(),
  );
  return getInviteById(id)!;
}

export const getInviteByCode = (code: string) =>
  get<InviteRow>(`SELECT * FROM invites WHERE code = ?`, code);
export const getInviteById = (id: string) =>
  get<InviteRow>(`SELECT * FROM invites WHERE id = ?`, id);
export const listInvites = () =>
  all<InviteRow>(`SELECT * FROM invites ORDER BY created_at DESC`);

export type InviteCheck =
  | { ok: true; invite: InviteRow }
  | { ok: false; reason: string };

export function checkInvite(code: string): InviteCheck {
  const invite = getInviteByCode(code);
  if (!invite) return { ok: false, reason: "邀请链接无效，请找社团要一个新的" };
  if (!invite.active) return { ok: false, reason: "这个邀请链接已经被停用了" };
  if (invite.expires_at && invite.expires_at < now())
    return { ok: false, reason: "邀请链接已过期" };
  if (invite.max_uses > 0 && invite.used_count >= invite.max_uses)
    return { ok: false, reason: "这个邀请链接的名额已经用完了" };
  return { ok: true, invite };
}

// ---------------------------------------------------------------- 用户

export const getUserById = (id: string) =>
  get<UserRow>(`SELECT * FROM users WHERE id = ?`, id);
export const getUserByQQ = (qq: string) =>
  get<UserRow>(`SELECT * FROM users WHERE qq = ?`, qq);

export function upsertUser(input: {
  qq: string; nickname: string; avatarKey: string | null; inviteId: string;
}): { user: UserRow; created: boolean } {
  const existing = getUserByQQ(input.qq);
  if (existing) {
    run(
      `UPDATE users SET nickname = ?, avatar_key = COALESCE(?, avatar_key), last_seen_at = ? WHERE id = ?`,
      input.nickname || existing.nickname, input.avatarKey, now(), existing.id,
    );
    return { user: getUserById(existing.id)!, created: false };
  }
  const id = nanoid(12);
  run(
    `INSERT INTO users (id, qq, nickname, avatar_key, invite_id, banned, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
    id, input.qq, input.nickname, input.avatarKey, input.inviteId, now(), now(),
  );
  run(`UPDATE invites SET used_count = used_count + 1 WHERE id = ?`, input.inviteId);
  return { user: getUserById(id)!, created: true };
}

/** 该用户能提交几张：个人覆盖 > 邀请链接设定 > 全局默认 */
export function quotaFor(user: UserRow): number {
  if (user.quota_override != null) return user.quota_override;
  const inv = user.invite_id ? getInviteById(user.invite_id) : undefined;
  if (inv?.quota_per_user != null) return inv.quota_per_user;
  return LIMITS.submissionsPerUser;
}

export const countSubmissions = (userId: string) =>
  get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM submissions WHERE user_id = ? AND status != 'rejected'`,
    userId,
  )!.n;

export const listUsers = () =>
  all<UserRow & { subs: number }>(
    `SELECT u.*, (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id) AS subs
     FROM users u ORDER BY u.last_seen_at DESC`,
  );

// ---------------------------------------------------------------- 素材

export function createAsset(input: Omit<AssetRow, "id" | "created_at">): AssetRow {
  const id = nanoid(16);
  run(
    `INSERT INTO assets (id, owner_id, kind, category, name, storage_key, mime, width, height, bytes, sort, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.owner_id, input.kind, input.category, input.name,
    input.storage_key, input.mime, input.width, input.height, input.bytes, input.sort, now(),
  );
  return get<AssetRow>(`SELECT * FROM assets WHERE id = ?`, id)!;
}

export const listUserAssets = (userId: string) =>
  all<AssetRow>(
    `SELECT * FROM assets WHERE owner_id = ? AND kind = 'upload' ORDER BY created_at DESC`,
    userId,
  );
export const countUserAssets = (userId: string) =>
  get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM assets WHERE owner_id = ? AND kind = 'upload'`,
    userId,
  )!.n;
export const listStickers = () =>
  all<AssetRow>(
    `SELECT * FROM assets WHERE kind = 'sticker' ORDER BY category, sort, created_at`,
  );
export const getAsset = (id: string) =>
  get<AssetRow>(`SELECT * FROM assets WHERE id = ?`, id);
export const deleteAsset = (id: string) => run(`DELETE FROM assets WHERE id = ?`, id);

// ---------------------------------------------------------------- 作品

export function createSubmission(input: {
  userId: string; inviteId: string | null; title: string; note: string;
  designJson: string; frontKey: string; backKey: string; thumbKey: string;
  frontBytes: number; backBytes: number;
}): SubmissionRow {
  const id = nanoid(14);
  run(
    `INSERT INTO submissions
      (id, user_id, invite_id, title, note, design_json, front_key, back_key, thumb_key,
       front_bytes, back_bytes, status, review_note, printed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', 0, ?, ?)`,
    id, input.userId, input.inviteId, input.title, input.note, input.designJson,
    input.frontKey, input.backKey, input.thumbKey,
    input.frontBytes, input.backBytes, now(), now(),
  );
  return getSubmission(id)!;
}

export const getSubmission = (id: string) =>
  get<SubmissionRow>(`SELECT * FROM submissions WHERE id = ?`, id);
/** 按存储 key 反查稿件，媒体接口在「审核后才可下载」模式下用 */
export const getSubmissionByMediaKey = (key: string) =>
  get<SubmissionRow>(
    `SELECT * FROM submissions WHERE front_key = ? OR back_key = ? OR thumb_key = ? LIMIT 1`,
    key, key, key,
  );

export const listUserSubmissions = (userId: string) =>
  all<SubmissionRow>(
    `SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC`,
    userId,
  );

export interface AdminSubmission extends SubmissionRow {
  qq: string; nickname: string;
}
export function listSubmissions(status?: string, limit = 200, offset = 0) {
  const where = status && status !== "all" ? `WHERE s.status = ?` : "";
  const args = status && status !== "all" ? [status, limit, offset] : [limit, offset];
  return all<AdminSubmission>(
    `SELECT s.*, u.qq, u.nickname FROM submissions s
     JOIN users u ON u.id = s.user_id
     ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    ...args,
  );
}
export interface GalleryRow {
  id: string; thumb_key: string; front_key: string;
  status: string; created_at: number; nickname: string;
}

/**
 * 首页作品墙。刻意不带 QQ 号和头像——头像地址里就是 QQ 号，
 * 而首页是不需要登录就能看的。
 */
export function listGallery(opts: { approvedOnly: boolean; limit?: number; after?: number }) {
  const conds = ["1=1"];
  const args: unknown[] = [];
  if (opts.approvedOnly) conds.push("s.status = 'approved'");
  else conds.push("s.status != 'rejected'");
  if (opts.after) {
    conds.push("s.created_at > ?");
    args.push(opts.after);
  }
  args.push(Math.min(opts.limit ?? 60, 120));
  return all<GalleryRow>(
    `SELECT s.id, s.thumb_key, s.front_key, s.status, s.created_at, u.nickname
     FROM submissions s JOIN users u ON u.id = s.user_id
     WHERE ${conds.join(" AND ")}
     ORDER BY s.created_at DESC LIMIT ?`,
    ...args,
  );
}

export const countGallery = (approvedOnly: boolean) =>
  get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM submissions WHERE ${approvedOnly ? "status = 'approved'" : "status != 'rejected'"}`,
  )!.n;

/** 作品墙对外只给这几个字段 */
export const publicGalleryItem = (r: GalleryRow) => ({
  id: r.id,
  thumb: `/api/media/${r.thumb_key}`,
  status: r.status,
  nickname: r.nickname || "匿名米娜",
  createdAt: r.created_at,
});

export const countGalleryAuthors = (approvedOnly: boolean) =>
  get<{ n: number }>(
    `SELECT COUNT(DISTINCT user_id) AS n FROM submissions WHERE ${approvedOnly ? "status = 'approved'" : "status != 'rejected'"}`,
  )!.n;

/** 全站累计收到多少张（被拒的不算）。「最大提交数量」这条限额按它判断 */
export const countAllSubmissions = () =>
  get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM submissions WHERE status != 'rejected'`,
  )!.n;

/** 每个状态下有几份稿件、加起来要印几张 */
export const submissionStats = () =>
  all<{ status: string; n: number; copies: number }>(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(copies), 0) AS copies
     FROM submissions GROUP BY status`,
  );

export function reviewSubmission(id: string, status: string, note: string) {
  run(
    `UPDATE submissions SET status = ?, review_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
    status, note, now(), now(), id,
  );
  return getSubmission(id);
}
/** 这一张印几份。0 = 这次不印（留着但不进印刷量） */
export function setCopies(id: string, copies: number) {
  const n = Math.max(0, Math.min(9999, Math.round(copies)));
  run(`UPDATE submissions SET copies = ?, updated_at = ? WHERE id = ?`, n, now(), id);
  return getSubmission(id);
}

export function setPrinted(id: string, printed: boolean) {
  run(`UPDATE submissions SET printed = ?, updated_at = ? WHERE id = ?`, printed ? 1 : 0, now(), id);
  return getSubmission(id);
}
export const deleteSubmission = (id: string) =>
  run(`DELETE FROM submissions WHERE id = ?`, id);

// ---------------------------------------------------------------- 设计稿（未提交）

export interface DocRow {
  id: string; user_id: string; name: string;
  design_json: string; created_at: number; updated_at: number;
}

/** 一个人最多留几份未提交的稿子，超了从最旧的开始丢 */
export const MAX_DOCS = 20;

/**
 * 早期版本一人只有一份草稿（drafts 表）。第一次用到多文档时把它搬进 docs，
 * 搬完就删掉原记录——留着会在下次又搬一遍。
 */
function migrateLegacyDraft(userId: string) {
  const d = get<{ design_json: string; updated_at: number }>(
    `SELECT design_json, updated_at FROM drafts WHERE user_id = ?`,
    userId,
  );
  if (!d) return;
  run(
    `INSERT INTO docs (id, user_id, name, design_json, created_at, updated_at)
     VALUES (?, ?, '', ?, ?, ?)`,
    nanoid(12), userId, d.design_json, d.updated_at, d.updated_at,
  );
  run(`DELETE FROM drafts WHERE user_id = ?`, userId);
}

export function listDocs(userId: string): DocRow[] {
  migrateLegacyDraft(userId);
  return all<DocRow>(
    `SELECT * FROM docs WHERE user_id = ? ORDER BY updated_at DESC`,
    userId,
  );
}

/** 进编辑器时接着改的那一份：最近动过的 */
export const latestDoc = (userId: string) => listDocs(userId)[0];

/** 拿别人的 id 来试探一律当作不存在 */
export const getDoc = (id: string, userId: string) =>
  get<DocRow>(`SELECT * FROM docs WHERE id = ? AND user_id = ?`, id, userId);

export function createDoc(userId: string, json: string, name = ""): DocRow {
  const id = nanoid(12);
  run(
    `INSERT INTO docs (id, user_id, name, design_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id, userId, name.slice(0, 40), json, now(), now(),
  );
  // 只留最近的 MAX_DOCS 份
  run(
    `DELETE FROM docs WHERE user_id = ? AND id NOT IN (
       SELECT id FROM docs WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?
     )`,
    userId, userId, MAX_DOCS,
  );
  return getDoc(id, userId)!;
}

/** 返回 false 表示这份稿子不属于他（或已经被删了） */
export function saveDoc(id: string, userId: string, json: string, name?: string): boolean {
  const r = name === undefined
    ? run(`UPDATE docs SET design_json = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        json, now(), id, userId)
    : run(`UPDATE docs SET design_json = ?, name = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        json, name.slice(0, 40), now(), id, userId);
  return Number(r.changes) > 0;
}

export const deleteDoc = (id: string, userId: string) =>
  run(`DELETE FROM docs WHERE id = ? AND user_id = ?`, id, userId);
