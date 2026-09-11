/**
 * 明信片物理规格与站点限额 —— 运行时可改。
 *
 * 这里的值是「活的」：SPEC / LIMITS / SITE 是同一个对象实例，
 * 任何地方 import 之后读属性拿到的都是当前值；BLEED_W 这类派生量用
 * `export let` + 重新赋值，ESM 的实时绑定保证使用处读到的是最新结果。
 * 所以调用方必须在**函数体内**读它们，不要在模块顶层 const 快照一份。
 *
 * 初值来自环境变量（仅作为首次启动的默认值），之后由后台设置覆盖：
 *   服务端 —— lib/settings.ts 从数据库读出并 applyConfig()
 *   浏览器 —— app/layout.tsx 注入 window.__PC_CONFIG__，本模块加载时读取
 */
const num = (v: string | undefined, d: number) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : d;
};
const bool = (v: string | undefined, d: boolean) =>
  v === undefined ? d : /^(1|true|yes|on)$/i.test(v);

/** 可在后台修改的全部配置。序列化后在服务端/浏览器之间传递 */
export interface AppConfig {
  card: {
    /** 成品尺寸（裁切后），毫米。标准明信片 148×100 */
    widthMm: number;
    heightMm: number;
    /** 出血，四边各留，毫米 */
    bleedMm: number;
    /** 安全区：距成品边的内缩，重要内容不要越过，毫米 */
    safeMm: number;
    /** 印刷分辨率 */
    dpi: number;
  };
  limits: {
    /** 每个 QQ 号默认可提交的明信片张数（邀请链接可单独覆盖） */
    submissionsPerUser: number;
    /** 整站累计最多收多少张，0 = 不限。收满之后谁都交不了 */
    totalSubmissions: number;
    /** 每人可上传的素材图片数量 */
    uploadsPerUser: number;
    /** 单张上传原图体积上限（字节） */
    uploadMaxBytes: number;
    /** 上传图片入库前压到的最长边（像素） */
    uploadMaxEdge: number;
    /** 单张素材入库后的目标体积（字节）。超了就二分 webp 质量往下压 */
    uploadTargetBytes: number;
    /** 成品单面目标体积上限（字节） */
    renderTargetBytes: number;
    /** 提交上传的原始 PNG 单面体积硬上限（字节） */
    renderUploadMaxBytes: number;
  };
  site: {
    name: string;
    clubName: string;
    /** 提交后是否立刻允许下载（后台审核只决定是否进入印刷清单） */
    downloadBeforeReview: boolean;
    /** 首页是否展示大家提交的作品墙 */
    showGallery: boolean;
    /** 作品墙只放审核通过的 */
    galleryApprovedOnly: boolean;
  };
}

function fromEnv(): AppConfig {
  return {
    card: {
      widthMm: num(process.env.CARD_WIDTH_MM, 148),
      heightMm: num(process.env.CARD_HEIGHT_MM, 100),
      bleedMm: num(process.env.CARD_BLEED_MM, 3),
      safeMm: num(process.env.CARD_SAFE_MM, 4),
      dpi: num(process.env.CARD_DPI, 300),
    },
    limits: {
      submissionsPerUser: num(process.env.LIMIT_SUBMISSIONS_PER_USER, 3),
      totalSubmissions: num(process.env.LIMIT_TOTAL_SUBMISSIONS, 0),
      uploadsPerUser: num(process.env.LIMIT_UPLOADS_PER_USER, 30),
      uploadMaxBytes: num(process.env.LIMIT_UPLOAD_MAX_BYTES, 20 * 1024 * 1024),
      uploadMaxEdge: num(process.env.LIMIT_UPLOAD_MAX_EDGE, 2600),
      uploadTargetBytes: num(process.env.LIMIT_UPLOAD_TARGET_BYTES, 1310720),
      renderTargetBytes: num(process.env.LIMIT_RENDER_TARGET_BYTES, 3 * 1024 * 1024),
      renderUploadMaxBytes: num(process.env.LIMIT_RENDER_UPLOAD_MAX_BYTES, 60 * 1024 * 1024),
    },
    site: {
      name: process.env.SITE_NAME || "社团明信片工坊",
      clubName: process.env.CLUB_NAME || "米娜的社团",
      downloadBeforeReview: bool(process.env.SITE_DOWNLOAD_BEFORE_REVIEW, true),
      showGallery: bool(process.env.SITE_GALLERY, true),
      galleryApprovedOnly: bool(process.env.SITE_GALLERY_APPROVED_ONLY, false),
    },
  };
}

/**
 * Next 会把每条路由单独打包，同一个模块在不同 bundle 里各有一份实例。
 * 所以配置必须挂在 globalThis 上，否则后台改完只有处理那个请求的 bundle 知道。
 * （lib/db.ts 里的连接也是同样的理由。）
 */
const store = (globalThis.__pcConfig ??= { live: fromEnv(), base: fromEnv() });

export const SPEC: AppConfig["card"] = store.live.card;
export const LIMITS: AppConfig["limits"] = store.live.limits;
export const SITE: AppConfig["site"] = store.live.site;

/** 环境变量给出的初值。后台「恢复默认」回到这一份 */
export const BASE_CONFIG: AppConfig = store.base;

export const mmToPx = (mm: number, dpi = SPEC.dpi) => (mm / 25.4) * dpi;

/**
 * 派生量一律写成函数：规格随时可能被后台改掉，
 * 任何形式的缓存（模块级常量、闭包快照）都会在改完之后画错版。
 */
/** 含出血的整版尺寸（毫米） */
export const bleedW = () => SPEC.widthMm + SPEC.bleedMm * 2;
export const bleedH = () => SPEC.heightMm + SPEC.bleedMm * 2;
/** 导出像素尺寸（含出血） */
export const exportW = () => Math.round(mmToPx(bleedW()));
export const exportH = () => Math.round(mmToPx(bleedH()));

/**
 * 每一面可以各自选朝向（SideDoc.turned）。turned 就是把长短边对调：
 * 卡片规格本身是横的时候，turned 的那一面就是竖版。
 * 凡是跟「这一面多大」有关的地方都要走下面这几个函数，
 * 直接用 bleedW()/bleedH() 会把竖版页画成横的。
 */
export const pageW = (turned = false) => (turned ? bleedH() : bleedW());
export const pageH = (turned = false) => (turned ? bleedW() : bleedH());
/** 成品（裁切后）尺寸，同样跟着朝向对调 */
export const trimW = (turned = false) => (turned ? SPEC.heightMm : SPEC.widthMm);
export const trimH = (turned = false) => (turned ? SPEC.widthMm : SPEC.heightMm);
export const pageExportW = (turned = false) => Math.round(mmToPx(pageW(turned)));
export const pageExportH = (turned = false) => Math.round(mmToPx(pageH(turned)));
/** 卡片本身是横是竖，决定界面上「竖版」按钮到底是哪个方向 */
export const cardIsLandscape = () => SPEC.widthMm >= SPEC.heightMm;
/** 界面上怎么称呼这一面的朝向。卡片规格本身可能就是竖的，不能写死 */
export const turnLabel = (turned = false) =>
  cardIsLandscape() !== turned ? "横版" : "竖版";

export function snapshotConfig(): AppConfig {
  return { card: { ...SPEC }, limits: { ...LIMITS }, site: { ...SITE } };
}

/** 就地覆盖当前配置。只认已知字段且类型对得上的值，其余忽略 */
export function applyConfig(patch: unknown) {
  const p = patch as Partial<AppConfig> | null | undefined;
  if (p && typeof p === "object") {
    assignNums(SPEC, p.card);
    assignNums(LIMITS, p.limits);
    if (p.site && typeof p.site === "object") {
      if (typeof p.site.name === "string") SITE.name = p.site.name;
      if (typeof p.site.clubName === "string") SITE.clubName = p.site.clubName;
      for (const k of ["downloadBeforeReview", "showGallery", "galleryApprovedOnly"] as const) {
        if (typeof p.site[k] === "boolean") SITE[k] = p.site[k];
      }
    }
  }
}

function assignNums<T extends Record<string, number>>(target: T, src: unknown) {
  if (!src || typeof src !== "object") return;
  for (const k of Object.keys(target) as (keyof T)[]) {
    const v = (src as Record<string, unknown>)[k as string];
    if (typeof v === "number" && Number.isFinite(v)) target[k] = v as T[keyof T];
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __PC_CONFIG__: AppConfig | undefined;
  // eslint-disable-next-line no-var
  var __pcConfig: { live: AppConfig; base: AppConfig } | undefined;
}

// 浏览器侧：读 app/layout.tsx 注入的那份，兜住「组件还没渲染就有人读配置」。
// 渲染期的时序由 components/ConfigBoot.tsx 保证。
if (typeof window !== "undefined") applyConfig(globalThis.__PC_CONFIG__);

export type Spec = AppConfig["card"];
