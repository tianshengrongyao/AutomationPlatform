/**
 * HTTP 工具函数
 * 统一的 JSON 错误响应、会话校验、密钥过滤
 */

import { NextResponse } from "next/server";
import { hasSession } from "./session";

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
