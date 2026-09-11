import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { ConfigBoot } from "@/components/ConfigBoot";
import "./globals.css";

// 配置可以在后台改，标题得每次请求现算
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  ensureConfig();
  return {
    title: SITE.name,
    description: `${SITE.clubName} · 在线设计属于你的明信片，我们负责印出来`,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff7fa8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = ensureConfig();
  return (
    <html lang="zh-CN">
      <head>
        {/*
          浏览器侧 lib/config.ts 在模块求值时读这个全局量，兜住「组件还没渲染
          就有人读配置」的情况。真正保证时序的是 <body> 里的 ConfigBoot——
          Next 把自己的 chunk 以 async 挂在这条脚本前面，先后顺序并不由我们说了算。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PC_CONFIG__=${JSON.stringify(cfg).replace(/</g, "\\u003c")}`,
          }}
        />
      </head>
      <body>
        <ConfigBoot config={cfg} />
        {children}
      </body>
    </html>
  );
}
