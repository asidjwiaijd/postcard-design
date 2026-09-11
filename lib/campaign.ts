import { LIMITS } from "./config";
import { countAllSubmissions } from "./repo";

export interface CampaignStatus {
  /** 全站上限，0 = 不限 */
  cap: number;
  /** 已经收到的张数（被拒的不算） */
  received: number;
  full: boolean;
  /** 还能收几张；不限时为 null */
  left: number | null;
}

/**
 * 这次征集的总闸门。提交接口、首页作品墙和编辑器都读它，
 * 免得各处各算一遍口径还对不上。
 */
export function campaignStatus(): CampaignStatus {
  const cap = Math.max(0, Math.round(LIMITS.totalSubmissions || 0));
  const received = countAllSubmissions();
  return {
    cap,
    received,
    full: cap > 0 && received >= cap,
    left: cap > 0 ? Math.max(0, cap - received) : null,
  };
}

export const campaignFullMsg = (cap: number) =>
  `这次征集一共收 ${cap} 张，已经收满啦，等下一次吧`;
