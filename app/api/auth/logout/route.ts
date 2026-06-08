/**
 * POST /api/auth/logout
 * 清除会话 Cookie → 退出登录
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
