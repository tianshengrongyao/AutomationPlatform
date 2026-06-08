/**
 * 环境变量读取工具
 * 所有密钥和配置统一从这里获取，避免在代码里直接写 process.env
 */

/** 读取必填环境变量，不存在直接报错 */
export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必填环境变量：${name}`);
  }
  return value;
}

/** 获取 API 基础地址，默认指向火山方舟官方 */
export function getArkBaseUrl() {
  return (process.env.ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, "");
}

/** 获取模型 ID */
export function getArkModelId() {
  return getRequiredEnv("ARK_MODEL_ID");
}

/** 获取 API 密钥（sk- 开头的是代理 Key，非 sk- 的是官方 Key） */
export function getArkApiKey() {
  return getRequiredEnv("ARK_API_KEY");
}

/** 创建视频任务的接口路径 */
export function getArkCreateTaskPath() {
  return process.env.ARK_CREATE_TASK_PATH?.trim() || "/contents/generations/tasks";
}

/** 查询视频任务的接口路径，{id} 会被替换为真实任务 ID */
export function getArkQueryTaskPath(taskId: string) {
  const path = process.env.ARK_QUERY_TASK_PATH?.trim() || "/contents/generations/tasks/{id}";
  return path.replace("{id}", encodeURIComponent(taskId));
}

/**
 * 安全检查：sk- 开头的代理 Key 不能请求火山方舟官方地址
 * 防止用户配错导致 Key 泄露到错误的服务端
 */
export function assertCompatibleGateway() {
  const baseUrl = getArkBaseUrl();
  const apiKey = getArkApiKey();
  const isOfficialArk = baseUrl === "https://ark.cn-beijing.volces.com/api/v3";

  if (isOfficialArk && apiKey.startsWith("sk-")) {
    throw new Error(
      "当前 API Key 是 sk- 开头的非官方/代理 Key，但 ARK_BASE_URL 仍是火山方舟官方地址。" +
      "请填写该 Key 对应的代理 Base URL，例如 ARK_BASE_URL=https://你的代理域名/v1"
    );
  }
}
