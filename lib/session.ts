/**
 * 会话管理
 * 使用 HMAC-SHA256 签名的 Cookie 实现简单的团队登录
 * 有效期 12 小时，过期需重新输入口令
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getRequiredEnv } from "./config";

/** Cookie 名称 */
const COOKIE_NAME = "seedance_session";

/** 会话有效期：12 小时 */
const MAX_AGE = 60 * 60 * 12;

/** 对内容进行 HMAC-SHA256 签名，防止 Cookie 被伪造 */
function sign(value: string) {
  return createHmac("sha256", getRequiredEnv("SESSION_SECRET"))
    .update(value)
    .digest("hex");
}

/** 生成一个新会话 Token：payload + 签名 */
function makeToken() {
  const payload = JSON.stringify({
    scope: "team",
    exp: Math.floor(Date.now() / 1000) + MAX_AGE  // 过期时间戳
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/** 验证 Token 是否合法且未过期 */
function verifyToken(token?: string) {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  // 用恒定时间比较防止时序攻击
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;

  // 检查是否过期
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      exp?: number;
    };
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** 检查当前请求是否已登录 */
export async function hasSession() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value);
}

/** 登录成功时写入会话 Cookie */
export async function setSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,    // JS 无法读取，防 XSS
    sameSite: "lax",   // 防止跨站请求携带
    secure: false,     // HTTP 环境传 Cookie；升级 HTTPS 后改为 true
    path: "/",
    maxAge: MAX_AGE
  });
}

/** 退出时清除会话 Cookie */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** 验证口令是否正确（与 .env.local 中的 SITE_PASSWORD 比对） */
export function isCorrectPassword(password: string) {
  return password === getRequiredEnv("SITE_PASSWORD");
}
