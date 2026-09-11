import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 部署用：产出自带 node_modules 子集的独立目录
  output: "standalone",
  // sharp 是原生模块，node:sqlite 是内置模块，都不能被打包器处理
  serverExternalPackages: ["sharp", "node:sqlite"],
  experimental: {
    serverActions: { bodySizeLimit: "80mb" },
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
