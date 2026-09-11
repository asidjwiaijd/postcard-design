/**
 * 后台可改配置的字段表：校验规则和界面文案共用同一份定义，
 * 加字段只改这里 + lib/config.ts 的 AppConfig。
 */
import type { AppConfig } from "./config";

export type FieldKind = "mm" | "int" | "mb" | "text" | "bool";

export interface FieldDef {
  /** 点号路径，如 card.widthMm */
  path: string;
  label: string;
  hint?: string;
  kind: FieldKind;
  min?: number;
  max?: number;
  /** 数字输入的步进 */
  step?: number;
  /** 改动会让已保存的草稿作废 */
  breaking?: boolean;
}

export const GROUPS: { id: string; title: string; note?: string }[] = [
  {
    id: "card",
    title: "明信片规格",
    note: "尺寸一旦开放投稿就别再动：已提交的成品比例会和新规格对不上，未提交的草稿会被判作废重来。要改就趁没人交稿之前，并且先跟印厂确认。另外自带的模板是按 148×100 横版排的，换成别的比例之后跑一次 npm run check，它会告诉你哪些模板的文字跑出了安全区。",
  },
  { id: "limits", title: "限额", note: "改完立刻生效，已经超额的用户不会被追溯删稿，只是传不了新的。「全站最多收」是这次征集的总闸门，收满之后首页会显示已满。" },
  { id: "site", title: "站点文案与首页" },
];

export const FIELDS: FieldDef[] = [
  { path: "card.widthMm", label: "成品宽", kind: "mm", min: 40, max: 400, step: 1, breaking: true, hint: "裁切后的尺寸，标准明信片 148" },
  { path: "card.heightMm", label: "成品高", kind: "mm", min: 40, max: 400, step: 1, breaking: true, hint: "标准明信片 100" },
  { path: "card.bleedMm", label: "出血", kind: "mm", min: 0, max: 20, step: 0.5, breaking: true, hint: "四边各留，给裁切误差。国内印厂一般要 3" },
  { path: "card.safeMm", label: "安全区", kind: "mm", min: 0, max: 30, step: 0.5, hint: "距成品边的内缩，重要内容别越过。只影响编辑器里的参考线" },
  { path: "card.dpi", label: "印刷分辨率", kind: "int", min: 72, max: 600, step: 1, hint: "300 是印刷标准。调高会让导出图更大更慢" },

  { path: "limits.submissionsPerUser", label: "每人可提交", kind: "int", min: 1, max: 100, hint: "张。邀请链接和单个用户都能单独覆盖这个值" },
  { path: "limits.totalSubmissions", label: "全站最多收", kind: "int", min: 0, max: 100000, hint: "张。收满之后所有人都交不了，填 0 表示不限。已经交上来的不会被退回" },
  { path: "limits.uploadsPerUser", label: "每人可上传素材", kind: "int", min: 1, max: 500, hint: "张图片" },
  { path: "limits.uploadMaxBytes", label: "单张上传上限", kind: "mb", min: 1, max: 100, step: 1, hint: "超过就直接拒收" },
  { path: "limits.uploadMaxEdge", label: "上传图最长边", kind: "int", min: 800, max: 8000, step: 100, hint: "像素。入库前压到这个尺寸，2600 够印满版 300dpi" },
  { path: "limits.uploadTargetBytes", label: "素材入库目标体积", kind: "mb", min: 0.25, max: 10, step: 0.25, hint: "入库时二分 webp 质量往这个体积压。素材只是画面里的一块，压到 1MB 上下印出来看不出差别" },
  { path: "limits.renderTargetBytes", label: "成品单面目标体积", kind: "mb", min: 1, max: 20, step: 0.5, hint: "后端二分 webp 质量往这个体积压" },
  { path: "limits.renderUploadMaxBytes", label: "提交原图硬上限", kind: "mb", min: 5, max: 200, step: 5, hint: "浏览器传上来的 PNG 单面上限，防止有人塞巨图" },

  { path: "site.name", label: "站点名", kind: "text", hint: "浏览器标签和首页标题" },
  { path: "site.clubName", label: "社团名", kind: "text", hint: "会出现在模板和文案里" },
  { path: "site.downloadBeforeReview", label: "提交后立即可下载", kind: "bool", hint: "关掉的话，用户要等后台通过才能下自己的图" },
  { path: "site.showGallery", label: "首页展示作品墙", kind: "bool", hint: "没登录的人也看得到大家交的稿（只显示缩略图和昵称，不露 QQ 号）" },
  { path: "site.galleryApprovedOnly", label: "作品墙只放已通过的", kind: "bool", hint: "开着就得先在后台点通过，作品才会出现在首页" },
];

export const fieldsOf = (group: string) => FIELDS.filter((f) => f.path.startsWith(group + "."));

export function readPath(cfg: AppConfig, path: string): unknown {
  const [g, k] = path.split(".");
  return (cfg as unknown as Record<string, Record<string, unknown>>)[g]?.[k];
}

function writePath(cfg: AppConfig, path: string, v: unknown) {
  const [g, k] = path.split(".");
  (cfg as unknown as Record<string, Record<string, unknown>>)[g][k] = v;
}

/**
 * 逐字段校验并归一化。输入和输出都用**存储单位**（体积是字节，不是 MB），
 * 界面上的 MB 换算由 SettingTab 负责——这样从数据库读回来的值可以原样再验一遍。
 * 缺字段或类型不对就用 fallback 里的旧值顶上，越界直接报错——
 * 与其悄悄夹到边界，不如让人知道自己填错了。
 */
export function validateConfig(
  input: unknown,
  fallback: AppConfig,
): { ok: true; value: AppConfig } | { ok: false; error: string } {
  const out: AppConfig = {
    card: { ...fallback.card },
    limits: { ...fallback.limits },
    site: { ...fallback.site },
  };
  const src = (input ?? {}) as Record<string, Record<string, unknown>>;

  for (const f of FIELDS) {
    const [g, k] = f.path.split(".");
    const raw = src[g]?.[k];
    if (raw === undefined || raw === null || raw === "") continue;

    if (f.kind === "text") {
      const s = String(raw).trim();
      if (!s) return { ok: false, error: `${f.label}不能留空` };
      if (s.length > 60) return { ok: false, error: `${f.label}最多 60 个字` };
      writePath(out, f.path, s);
      continue;
    }
    if (f.kind === "bool") {
      writePath(out, f.path, raw === true || raw === "true" || raw === 1);
      continue;
    }
    let n = Number(raw);
    if (!Number.isFinite(n)) return { ok: false, error: `${f.label}得是数字` };
    if (f.kind === "mb" || f.kind === "int") n = Math.round(n);
    if (f.kind === "mm") n = Math.round(n * 100) / 100;
    const min = f.kind === "mb" ? (f.min ?? 0) * 1048576 : (f.min ?? -Infinity);
    const max = f.kind === "mb" ? (f.max ?? 0) * 1048576 : (f.max ?? Infinity);
    if (n < min || n > max) {
      const show = (x: number) => (f.kind === "mb" ? `${x / 1048576}MB` : String(x));
      return { ok: false, error: `${f.label}要在 ${show(min)} 到 ${show(max)} 之间` };
    }
    writePath(out, f.path, n);
  }

  // 跨字段的约束
  const c = out.card;
  if (c.safeMm * 2 >= Math.min(c.widthMm, c.heightMm)) {
    return { ok: false, error: "安全区太大了，两边加起来已经超过成品尺寸" };
  }
  if (out.limits.renderUploadMaxBytes < out.limits.renderTargetBytes) {
    return { ok: false, error: "提交原图硬上限不能小于成品目标体积" };
  }
  const px = ((c.widthMm + c.bleedMm * 2) / 25.4) * c.dpi;
  const py = ((c.heightMm + c.bleedMm * 2) / 25.4) * c.dpi;
  if (px * py > 60_000_000) {
    return {
      ok: false,
      error: `这个尺寸配这个分辨率要出 ${Math.round(px)}×${Math.round(py)} 的图，太大了，浏览器画布扛不住`,
    };
  }
  return { ok: true, value: out };
}
