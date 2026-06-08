/**
 * GET /api/session
 * 查询当前登录状态（前端用来判断是否显示登录页）
 */

import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";

export async function GET() {
  return NextResponse.json({ authenticated: await hasSession() });
}
