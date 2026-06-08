import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { isCorrectPassword, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password) {
    return jsonError("请输入访问口令。", 400);
  }

  if (!isCorrectPassword(body.password)) {
    return jsonError("访问口令不正确。", 401);
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
