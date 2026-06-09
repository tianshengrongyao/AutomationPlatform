/**
 * HTTP 工具函数
 * 统一的 JSON 错误响应、会话校验、密钥过滤
 */

import { NextResponse } from "next/server";
import { hasSession } from "./session";

/**
 * 从上游 API 返回的 JSON 错误中提取人类可读信息
 *
 * 错误格式一般是嵌套 JSON：
 * {"error":{"code":"...","message":"真实错误信息","param":"..."}}
 * 这个函数递归解析，提取 message 字段，同时翻译常见错误码
 */
export function parseUpstreamError(raw: unknown): string {
  // 尝试解析 JSON 字符串
  let data: unknown = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // 不是 JSON，直接用作错误信息
    }
  }

  // 递归提取 message 字段
  function extract(obj: unknown): string | undefined {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return undefined;
    const record = obj as Record<string, unknown>;

    // 优先取 message
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    // 其次取 error
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }
    // 再往内层找
    for (const key of ["error", "data", "details", "result", "body"]) {
      const inner = extract(record[key]);
      if (inner) return inner;
    }
    return undefined;
  }

  const message = extract(data);

  if (!message) {
    // 完全解析失败，返回安全的默认信息
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    return text.length > 200 ? text.slice(0, 200) + "…" : text;
  }

  // 中文翻译常见错误码/关键词
  const translations: Record<string, string> = {
    "InputImageSensitiveContentDetected": "输入图片触发了敏感内容检测",
    "PrivacyInformation": "图片中可能包含真实人物信息",
    "real person": "图片中检测到真实人物",
    "sensitive": "内容包含敏感信息",
    "not valid": "参数无效",
    "resource not found": "资源未找到（图片/视频无法访问）",
    "InvalidParameter": "请求参数不正确",
    "BadRequest": "请求格式有误",
    "content[0].image_url": "图片地址",
    "InternalError": "服务内部错误，请稍后重试",
  };

  let result = message;
  for (const [key, cn] of Object.entries(translations)) {
    // 用中文替换，更友好
    if (result.includes(key)) {
      result = result.replace(new RegExp(key, "gi"), cn);
    }
  }

  // 如果最终还是英文且很长，截断
  if (result.length > 300) {
    result = result.slice(0, 300) + "…";
  }

  return result;
}

/**
 * 过滤错误信息中的敏感数据
 * 防止 API Key 意外出现在报错响应中返回给前端
 */
function sanitizeDetails(details: unknown): unknown {
  if (typeof details === "string") {
    return details
      .replace(/Bearer\s+sk-[A-Za-z0-9_-]+/g, "Bearer sk-***")
      .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***");
  }
  return details;
}

/** 返回统一格式的 JSON 错误响应 */
export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, details: sanitizeDetails(details) },
    { status }
  );
}

/**
 * 从上游 API 的错误响应中提取 HTTP 状态码
 * 如果提取不到，默认返回 502（网关错误）
 */
export function statusFromUpstreamError(details: unknown, fallback = 502) {
  if (typeof details !== "string") return fallback;
  const match = details.match(/"status_code"\s*:\s*"?(\d{3})"?|status\s*code\s*(\d{3})/i);
  const status = Number(match?.[1] || match?.[2]);
  return status >= 400 && status < 600 ? status : fallback;
}

/**
 * 会话守卫：调用此函数检查登录状态
 * 未登录返回 401，已登录返回 null
 * 用法：const unauthorized = await requireSession(); if (unauthorized) return unauthorized;
 */
export async function requireSession() {
  if (!(await hasSession())) {
    return jsonError("请先登录。", 401);
  }
  return null;
}
