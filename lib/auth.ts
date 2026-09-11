import { readUserSession } from "./session";
import { getUserById, quotaFor, countSubmissions, type UserRow } from "./repo";

export interface CurrentUser {
  user: UserRow;
  inviteId: string | null;
  quota: number;
  used: number;
}

export async function currentUser(): Promise<CurrentUser | null> {
  const s = await readUserSession();
  if (!s?.uid) return null;
  const user = getUserById(s.uid);
  if (!user || user.banned) return null;
  return {
    user,
    inviteId: s.inv ?? user.invite_id,
    quota: quotaFor(user),
    used: countSubmissions(user.id),
  };
}

export function publicUser(c: CurrentUser) {
  return {
    id: c.user.id,
    qq: c.user.qq,
    nickname: c.user.nickname,
    avatar: `/api/qq/avatar/${c.user.qq}`,
    quota: c.quota,
    used: c.used,
  };
}
