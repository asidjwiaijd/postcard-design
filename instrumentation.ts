/**
 * 服务进程启动时先把后台保存的配置载进来，
 * 保证任何一个页面/接口被求值之前 SPEC、LIMITS、SITE 已经是最新的。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureConfig } = await import("./lib/settings");
  ensureConfig();
}
