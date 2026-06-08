export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必填环境变量：${name}`);
  }
  return value;
}

export function getArkBaseUrl() {
  return (process.env.ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/+$/, "");
}

export function getArkModelId() {
  return getRequiredEnv("ARK_MODEL_ID");
}

export function getArkApiKey() {
  return getRequiredEnv("ARK_API_KEY");
}

export function getArkCreateTaskPath() {
  return process.env.ARK_CREATE_TASK_PATH?.trim() || "/contents/generations/tasks";
}

export function getArkQueryTaskPath(taskId: string) {
  const path = process.env.ARK_QUERY_TASK_PATH?.trim() || "/contents/generations/tasks/{id}";
  return path.replace("{id}", encodeURIComponent(taskId));
}

export function assertCompatibleGateway() {
  const baseUrl = getArkBaseUrl();
  const apiKey = getArkApiKey();
  const isOfficialArk = baseUrl === "https://ark.cn-beijing.volces.com/api/v3";

  if (isOfficialArk && apiKey.startsWith("sk-")) {
    throw new Error(
      "当前 API Key 是 sk- 开头的非官方/代理 Key，但 ARK_BASE_URL 仍是火山方舟官方地址。请填写该 Key 对应的代理 Base URL，例如 ARK_BASE_URL=https://你的代理域名/v1 或领导提供的接口地址。"
    );
  }
}
