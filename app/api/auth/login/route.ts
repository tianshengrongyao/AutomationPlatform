/**
 * POST /api/auth/login
 * 验证团队口令 → 签发会话 Cookie
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { isCorrectPassword, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  // 解析请求体中的 password
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password) {
    return jsonError("请输入访问口令。", 400);
  }

  // 比对口令
  if (!isCorrectPassword(body.password)) {
    return jsonError("访问口令不正确。", 401);
  }

  // 口令正确 → 写入会话 Cookie
  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
