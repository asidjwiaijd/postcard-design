"use client";

import { applyConfig, type AppConfig } from "@/lib/config";

/**
 * 把服务端算好的配置灌进浏览器侧的 lib/config.ts。
 *
 * 为什么不只靠 <head> 里的内联脚本：Next 把自己的 chunk 以 async 插在
 * 我们的脚本前面，理论上它们可能先执行。这个组件渲染在 <body> 的最前面，
 * React 按顺序渲染兄弟节点，所以任何读 SPEC/BLEED_W 的组件渲染时，
 * 配置一定已经就位。两道保险都留着：内联脚本管模块求值期，这个管渲染期。
 */
export function ConfigBoot({ config }: { config: AppConfig }) {
  applyConfig(config);
  return null;
}
