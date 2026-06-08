import { NextResponse } from "next/server";
import { hasSession } from "./session";

function sanitizeDetails(details: unknown): unknown {
  if (typeof details === "string") {
    return details
      .replace(/Bearer\s+sk-[A-Za-z0-9_-]+/g, "Bearer sk-***")
      .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***");
  }
  return details;
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details: sanitizeDetails(details) }, { status });
}

export function statusFromUpstreamError(details: unknown, fallback = 502) {
  if (typeof details !== "string") return fallback;
  const match = details.match(/"status_code"\s*:\s*"?(\d{3})"?|status\s*code\s*(\d{3})/i);
  const status = Number(match?.[1] || match?.[2]);
  return status >= 400 && status < 600 ? status : fallback;
}

export async function requireSession() {
  if (!(await hasSession())) {
    return jsonError("请先登录。", 401);
  }
  return null;
}
