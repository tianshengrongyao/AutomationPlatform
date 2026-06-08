/**
 * 运镜预设 & 风格预设
 * 定义 8 种镜头运动方式和 8 种画面风格，以按钮网格展示
 * 选中的预设会自动拼接 prompt 前缀
 */

"use client";

import { Camera } from "lucide-react";

export type CameraPreset = {
  id: string;
  name: string;
  label: string;
  promptPrefix: string;
};

// 对齐即梦的 8 种运镜方式
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "push_in",
    name: "推镜",
    label: "Push In",
    promptPrefix: "运镜：推镜，镜头缓缓向前推进。"
  },
  {
    id: "pull_out",
    name: "拉镜",
    label: "Pull Out",
    promptPrefix: "运镜：拉镜，镜头向后拉远。"
  },
  {
    id: "pan",
    name: "摇镜",
    label: "Pan",
    promptPrefix: "运镜：摇镜，水平旋转拍摄。"
  },
  {
    id: "truck",
    name: "移镜",
    label: "Truck",
    promptPrefix: "运镜：移镜，水平平移。"
  },
  {
    id: "follow",
    name: "跟镜",
    label: "Follow",
    promptPrefix: "运镜：跟镜，跟随主体移动。"
  },
  {
    id: "pedestal_up",
    name: "升镜",
    label: "Up",
    promptPrefix: "运镜：升镜，镜头垂直上升。"
  },
  {
    id: "pedestal_down",
    name: "降镜",
    label: "Down",
    promptPrefix: "运镜：降镜，镜头垂直下降。"
  },
  {
    id: "orbit",
    name: "环绕",
    label: "Orbit",
    promptPrefix: "运镜：环绕，环绕主体旋转。"
  }
];

// 风格预设
export type StylePreset = {
  id: string;
  name: string;
  promptPrefix: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  { id: "photorealistic", name: "写实", promptPrefix: "风格：写实。" },
  { id: "cinematic", name: "电影感", promptPrefix: "风格：电影感。" },
  { id: "anime", name: "动漫", promptPrefix: "风格：动漫。" },
  { id: "3d_render", name: "3D 渲染", promptPrefix: "风格：3D 渲染。" },
  { id: "oil_painting", name: "油画", promptPrefix: "风格：油画。" },
  { id: "watercolor", name: "水彩", promptPrefix: "风格：水彩。" },
  { id: "cyberpunk", name: "赛博朋克", promptPrefix: "风格：赛博朋克。" },
  { id: "vintage_film", name: "复古胶片", promptPrefix: "风格：复古胶片。" }
];

export default function CameraPresets({
  selectedCamera,
  selectedStyle,
  onSelectCamera,
  onSelectStyle
}: {
  selectedCamera: string | null;
  selectedStyle: string | null;
  onSelectCamera: (id: string | null) => void;
  onSelectStyle: (id: string | null) => void;
}) {
  return (
    <>
      <div className="sidebar-section">
        <h3>运镜方式</h3>
        <div className="preset-grid">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip${selectedCamera === preset.id ? " selected" : ""}`}
              onClick={() => onSelectCamera(selectedCamera === preset.id ? null : preset.id)}
              title={preset.label}
            >
              <Camera size={16} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>画面风格</h3>
        <div className="preset-grid">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-chip${selectedStyle === preset.id ? " selected" : ""}`}
              onClick={() => onSelectStyle(selectedStyle === preset.id ? null : preset.id)}
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
