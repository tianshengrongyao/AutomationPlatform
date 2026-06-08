"use client";

import {
  ArrowUpRight,
  Clipboard,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2
} from "lucide-react";
import type { StoredTask } from "@/lib/types";
import VideoPlayer from "./video-player";

function statusText(status: string) {
  const map: Record<string, string> = {
    queued: "排队中",
    running: "生成中",
    cancelled: "已取消",
    succeeded: "已完成",
    failed: "失败",
    expired: "已超时",
    unknown: "未知"
  };
  return map[status] || status;
}

function isActive(task?: StoredTask) {
  if (!task) return false;
  return !["cancelled", "succeeded", "failed", "expired"].includes(task.status);
}

function progressValue(progress?: string) {
  if (!progress) return 0;
  const match = progress.match(/\d+(\.\d+)?/);
  if (!match) return 0;
  return Math.max(0, Math.min(100, Number(match[0])));
}

export default function ResultPanel({
  tasks,
  selectedTaskId,
  onSelectTask,
  onRefreshTask,
  onCopyTaskId,
  onRemoveTask,
  deletingTaskId
}: {
  tasks: StoredTask[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onRefreshTask: (id: string) => Promise<void>;
  onCopyTaskId: (id: string) => Promise<void>;
  onRemoveTask: (id: string) => Promise<void>;
  deletingTaskId: string | null;
}) {
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  return (
    <aside className="result-panel">
      {/* Preview */}
      {selectedTask ? (
        <div className="result-content">
          <span className={`status-pill ${selectedTask.status}`}>
            {statusText(selectedTask.status)}
          </span>

          {selectedTask.response?.content?.video_url ? (
            <VideoPlayer src={selectedTask.response.content.video_url} />
          ) : (
            <div className="video-skeleton">
              <div style={{ textAlign: "center" }}>
                <Sparkles size={28} style={{ opacity: 0.4, marginBottom: 12 }} />
                <span style={{ display: "block", color: "var(--color-ink-tertiary)", fontSize: "var(--text-sm)" }}>
                  任务完成后会显示视频预览
                </span>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="progress-block">
            <div className="progress-label">
              <span>生成进度</span>
              <strong>
                {selectedTask.response?.progress ||
                  (isActive(selectedTask) ? "等待更新" : "-")}
              </strong>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressValue(selectedTask.response?.progress)}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="task-actions">
            <button type="button" onClick={() => onRefreshTask(selectedTask.id)}>
              <RefreshCw size={15} />
              刷新
            </button>
            <button type="button" onClick={() => onCopyTaskId(selectedTask.id)}>
              <Clipboard size={15} />
              复制 ID
            </button>
            {selectedTask.response?.content?.video_url ? (
              <a
                href={selectedTask.response.content.video_url}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight size={15} />
                打开视频
              </a>
            ) : null}
          </div>

          {/* Meta */}
          <dl className="meta-grid">
            <div className="meta-item">
              <dt>比例</dt>
              <dd>{selectedTask.response?.ratio || selectedTask.request.options.ratio}</dd>
            </div>
            <div className="meta-item">
              <dt>分辨率</dt>
              <dd>{selectedTask.response?.resolution || selectedTask.request.options.resolution}</dd>
            </div>
            <div className="meta-item">
              <dt>时长</dt>
              <dd>{selectedTask.response?.duration || selectedTask.request.options.duration}s</dd>
            </div>
            <div className="meta-item">
              <dt>消耗 Token</dt>
              <dd>{selectedTask.response?.usage?.total_tokens || "-"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="result-empty">
          <Sparkles size={36} />
          <span>提交第一个任务后<br />这里会展示结果。</span>
        </div>
      )}

      {/* History */}
      <div className="history-section">
        <h3>任务历史 ({tasks.length})</h3>
        {tasks.length === 0 ? (
          <p style={{ color: "var(--color-ink-tertiary)", fontSize: "var(--text-sm)" }}>
            暂无任务。
          </p>
        ) : null}
        <div className="history-list">
          {tasks.map((task) => (
            <div className="history-row" key={task.id}>
              <button
                type="button"
                className={`history-item${task.id === selectedTask?.id ? " active" : ""}`}
                onClick={() => onSelectTask(task.id)}
              >
                <span>{task.prompt.slice(0, 42) || "未命名任务"}</span>
                <strong>{statusText(task.status)}</strong>
              </button>
              <button
                type="button"
                className="history-delete"
                onClick={() => onRemoveTask(task.id)}
                disabled={deletingTaskId === task.id}
                title="删除历史"
              >
                {deletingTaskId === task.id ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
