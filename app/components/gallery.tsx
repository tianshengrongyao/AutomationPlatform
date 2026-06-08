"use client";

import { Eye, Sparkles, Wand2 } from "lucide-react";
import type { StoredTask } from "@/lib/types";

export default function Gallery({
  tasks,
  onUseTemplate,
  onPreview
}: {
  tasks: StoredTask[];
  onUseTemplate: (task: StoredTask) => void;
  onPreview: (taskId: string) => void;
}) {
  const succeeded = tasks.filter((t) => t.status === "succeeded");

  if (succeeded.length === 0) {
    return (
      <div className="gallery-view">
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "50vh",
          gap: "var(--space-lg)",
          color: "var(--color-ink-tertiary)"
        }}>
          <Sparkles size={48} style={{ opacity: 0.3 }} />
          <p>还没有完成的作品。去创作页生成第一个视频吧！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-view">
      <div className="gallery-header">
        <h2>灵感画廊</h2>
        <span style={{ color: "var(--color-ink-tertiary)", fontSize: "var(--text-sm)" }}>
          {succeeded.length} 个作品
        </span>
      </div>

      <div className="gallery-grid">
        {succeeded.map((task) => (
          <div key={task.id} className="gallery-card">
            <div className="gallery-card-thumb">
              {task.response?.content?.video_url ? (
                <video
                  src={task.response.content.video_url}
                  muted
                  loop
                  playsInline
                  onMouseEnter={(e) => {
                    (e.target as HTMLVideoElement).play().catch(() => {});
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLVideoElement).pause();
                    (e.target as HTMLVideoElement).currentTime = 0;
                  }}
                />
              ) : (
                <div className="thumb-placeholder">
                  <Sparkles size={24} />
                </div>
              )}
            </div>

            <div className="gallery-card-body">
              <div className="prompt-line" title={task.prompt}>
                {task.prompt || "未命名作品"}
              </div>
              <div className="meta-line">
                <span>{task.model}</span>
                <span>
                  {new Date(task.createdAt).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </div>

            <div className="gallery-card-actions">
              <button type="button" onClick={() => onUseTemplate(task)}>
                <Wand2 size={14} />
                做同款
              </button>
              <button type="button" onClick={() => onPreview(task.id)}>
                <Eye size={14} />
                查看
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
