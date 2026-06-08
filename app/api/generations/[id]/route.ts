import { NextResponse } from "next/server";
import { getArkTask } from "@/lib/ark";
import { jsonError, requireSession, statusFromUpstreamError } from "@/lib/http";
import { saveTaskVideoLocally } from "@/lib/local-video";
import { deleteTask, getStoredTask, updateTask } from "@/lib/task-store";

const terminalStatuses = new Set(["cancelled", "succeeded", "failed", "expired"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) {
    return jsonError("缺少任务 ID。", 400);
  }

  try {
    const storedTask = await getStoredTask(id);
    if (storedTask && terminalStatuses.has(storedTask.status)) {
      const response = storedTask.response ? await saveTaskVideoLocally(storedTask.response).catch(() => storedTask.response) : undefined;
      if (response && response.content?.video_url !== storedTask.response?.content?.video_url) {
        const updatedTask = await updateTask(id, response);
        return NextResponse.json({ task: updatedTask || { ...storedTask, response } });
      }
      return NextResponse.json({ task: storedTask });
    }

    const arkTask = await saveTaskVideoLocally(await getArkTask(id));
    const task = await updateTask(id, arkTask);
    return NextResponse.json({ task: task || { id, status: arkTask.status || "unknown", response: arkTask } });
  } catch (error) {
    const details = error instanceof Error ? error.message : error;
    return jsonError("查询视频生成任务失败。", statusFromUpstreamError(details), details);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) {
    return jsonError("缺少任务 ID。", 400);
  }

  const deleted = await deleteTask(id);
  if (!deleted) {
    return jsonError("任务不存在。", 404);
  }

  return NextResponse.json({ ok: true });
}
