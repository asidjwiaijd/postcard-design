export interface FontDef {
  id: string;
  name: string;
  /** CSS font-family，同时也是 Konva 的 fontFamily */
  stack: string;
  /** 是否需要等待网络字体加载 */
  web: boolean;
  hint: string;
}

export const FONTS: FontDef[] = [
  { id: "sans", name: "系统黑体", stack: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif', web: false, hint: "百搭，正文首选" },
  { id: "serif", name: "系统宋体", stack: '"Songti SC", "SimSun", Georgia, serif', web: false, hint: "端正，适合竖排" },
  { id: "wenkai", name: "霞鹜文楷", stack: '"LXGW WenKai", serif', web: true, hint: "手写楷体，温柔" },
  { id: "kuaile", name: "站酷快乐体", stack: '"ZCOOL KuaiLe", sans-serif', web: true, hint: "圆润活泼，标题" },
  { id: "xiaowei", name: "站酷小薇", stack: '"ZCOOL XiaoWei", serif', web: true, hint: "清瘦优雅" },
  { id: "mashan", name: "马善政毛笔", stack: '"Ma Shan Zheng", cursive', web: true, hint: "毛笔手写，落款" },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** 由 stack 反查，用于把文档里存的 stack 映射回选择器 */
export const fontByStack = (stack: string) =>
  FONTS.find((f) => f.stack === stack) ?? FONTS[0];

/**
 * Canvas 不像 DOM 那样会自动触发字体下载，导出前必须显式等待，
 * 否则 300dpi 成品会退化成系统兜底字体。
 */
export async function ensureFonts(
  pairs: { stack: string; text: string }[],
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const jobs: Promise<unknown>[] = [];
  for (const { stack, text } of pairs) {
    if (!text) continue;
    const family = stack.split(",")[0].trim();
    if (!family.startsWith('"')) continue; // 系统字体栈无需等待
    try {
      jobs.push(document.fonts.load(`400 64px ${family}`, text));
    } catch {
      /* 字体名异常时忽略，退回系统字体 */
    }
  }
  await Promise.all(jobs);
  await document.fonts.ready;
}
