/**
 * /api/generations/[id]
 *
 * GET    → 查询单个任务状态（已完成的任务直接读本地数据库，活跃任务调用上游 API 刷新）
 * DELETE → 删除任务历史记录
 */

import { NextResponse } from "next/server";
import { getArkTask } from "@/lib/ark";
import { jsonError, requireSession, statusFromUpstreamError } from "@/lib/http";
import { saveTaskVideoLocally } from "@/lib/local-video";
import { deleteTask, getStoredTask, updateTask } from "@/lib/task-store";

/** 已完成/已取消/失败/超时 的任务不再轮询上游 API */
const terminalStatuses = new Set(["cancelled", "succeeded", "failed", "expired"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  if (!id) {
    return jsonError("缺少任务 ID。", 400);
  }

  try {
    // 先查本地数据库
    const storedTask = await getStoredTask(id);

    // 如果是终止状态：直接返回本地数据（不再消费上游 API）
    if (storedTask && terminalStatuses.has(storedTask.status)) {
      // 但还是尝试下载视频到本地（以防之前没下载成功）
      const response = storedTask.response
        ? await saveTaskVideoLocally(storedTask.response).catch(() => storedTask.response)
        : undefined;
      if (response && response.content?.video_url !== storedTask.response?.content?.video_url) {
        const updatedTask = await updateTask(id, response);
        return NextResponse.json({ task: updatedTask || { ...storedTask, response } });
      }
      return NextResponse.json({ task: storedTask });
    }

    // 活跃任务：调用上游 API 获取最新状态 → 更新数据库 → 尝试下载视频
    const arkTask = await saveTaskVideoLocally(await getArkTask(id));
    const task = await updateTask(id, arkTask);
    return NextResponse.json({
      task: task || { id, status: arkTask.status || "unknown", response: arkTask }
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : error;
    return jsonError("查询视频生成任务失败。", statusFromUpstreamError(details), details);
  }
}

/** 删除任务 */
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
