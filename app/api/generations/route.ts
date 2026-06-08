import { NextResponse } from "next/server";
import { createArkTask } from "@/lib/ark";
import { jsonError, requireSession, statusFromUpstreamError } from "@/lib/http";
import { saveTaskVideoLocally } from "@/lib/local-video";
import { addTask, listTasks } from "@/lib/task-store";
import { createGenerationSchema } from "@/lib/validation";

export async function GET() {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ tasks: await listTasks() });
}

export async function POST(request: Request) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const raw = await request.json().catch(() => null);
  const parsed = createGenerationSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError("请求参数不完整或格式不正确。", 400, parsed.error.flatten());
  }

  try {
    const arkTask = await saveTaskVideoLocally(await createArkTask(parsed.data));
    if (!arkTask.id) {
      return jsonError("服务端未返回任务 ID。", 502, arkTask);
    }
    const task = await addTask(arkTask.id, parsed.data, arkTask);
    return NextResponse.json({ task });
  } catch (error) {
    const details = error instanceof Error ? error.message : error;
    return jsonError("创建视频生成任务失败。", statusFromUpstreamError(details), details);
  }
}
