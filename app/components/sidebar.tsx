/**
 * 左侧工具栏
 * 创作模式切换、视频比例选择、运镜预设、画面风格预设
 */

"use client";

import { Film, Image as ImageIcon, X } from "lucide-react";
import CameraPresets from "./camera-presets";

export type CreationMode = "text-to-video" | "image-to-video";

const RATIOS = [
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "21:9", label: "21:9" }
];

export default function Sidebar({
  mode,
  onModeChange,
  ratio,
  onRatioChange,
  selectedCamera,
  selectedStyle,
  onSelectCamera,
  onSelectStyle,
  mobileOpen,
  onMobileClose
}: {
  mode: CreationMode;
  onModeChange: (mode: CreationMode) => void;
  ratio: string;
  onRatioChange: (ratio: string) => void;
  selectedCamera: string | null;
  selectedStyle: string | null;
  onSelectCamera: (id: string | null) => void;
  onSelectStyle: (id: string | null) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <div className="sidebar-overlay" onClick={onMobileClose} />
      ) : null}
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        {/* 移动端关闭按钮 */}
        {mobileOpen ? (
          <button
            type="button"
            onClick={onMobileClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-ink-secondary)",
              cursor: "pointer"
            }}
          >
            <X size={16} />
          </button>
        ) : null}

        {/* 创作模式 */}
        <div className="sidebar-section">
          <h3>创作模式</h3>
          <div className="mode-switcher">
            <button
              type="button"
              className={`mode-btn${mode === "text-to-video" ? " active" : ""}`}
              onClick={() => onModeChange("text-to-video")}
            >
              <Film size={18} />
              <span>文生视频</span>
            </button>
            <button
              type="button"
              className={`mode-btn${mode === "image-to-video" ? " active" : ""}`}
              onClick={() => onModeChange("image-to-video")}
            >
              <ImageIcon size={18} aria-hidden="true" />
              <span>图生视频</span>
            </button>
          </div>
        </div>

        {/* 视频比例 */}
        <div className="sidebar-section">
          <h3>视频比例</h3>
          <div className="ratio-grid">
            {RATIOS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`ratio-btn${ratio === r.value ? " selected" : ""}`}
                onClick={() => onRatioChange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 运镜 + 风格 */}
        <CameraPresets
          selectedCamera={selectedCamera}
          selectedStyle={selectedStyle}
          onSelectCamera={onSelectCamera}
          onSelectStyle={onSelectStyle}
        />
      </aside>
    </>
  );
}
