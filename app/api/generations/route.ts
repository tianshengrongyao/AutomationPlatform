/**
 * /api/generations
 *
 * GET  → 获取所有任务列表（按时间倒序）
 * POST → 创建新的视频生成任务
 */

import { NextResponse } from "next/server";
import { createArkTask } from "@/lib/ark";
import { jsonError, parseUpstreamError, requireSession, statusFromUpstreamError } from "@/lib/http";
import { saveTaskVideoLocally } from "@/lib/local-video";
import { addTask, listTasks } from "@/lib/task-store";
import { createGenerationSchema } from "@/lib/validation";

/** 获取所有任务 */
export async function GET() {
  // 未登录拒绝访问
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ tasks: await listTasks() });
}

/** 创建新任务 */
export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  // 解析并校验请求参数
  const raw = await request.json().catch(() => null);
  const parsed = createGenerationSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("请求参数不完整或格式不正确。", 400, parsed.error.flatten());
  }

  try {
    // 调用上游 API 创建任务 → 尝试下载视频到本地 → 存入数据库
    const arkTask = await saveTaskVideoLocally(await createArkTask(parsed.data));
    if (!arkTask.id) {
      return jsonError("服务端未返回任务 ID。", 502, arkTask);
    }
    const task = await addTask(arkTask.id, parsed.data, arkTask);
    return NextResponse.json({ task });
  } catch (error) {
    const details = error instanceof Error ? error.message : error;
    const readableMessage = parseUpstreamError(details);
    return jsonError(readableMessage, statusFromUpstreamError(details));
  }
}
