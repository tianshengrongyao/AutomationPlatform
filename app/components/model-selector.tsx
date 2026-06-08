/**
 * 模型选择器
 * 顶栏下拉菜单，切换 Seedance 2.0 / Fast / 720p 等模型
 */

"use client";

import { ChevronDown, Cpu } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: "seedance-2.0-1080",
    name: "Seedance 2.0",
    description: "旗舰视频生成模型，最高质量输出",
    badge: "推荐"
  },
  {
    id: "seedance-2.0-1080-fast",
    name: "Seedance 2.0 Fast",
    description: "加速版本，生成更快，质量略低"
  },
  {
    id: "seedance-2.0-720",
    name: "Seedance 2.0 720p",
    description: "720p 分辨率，适合快速预览"
  }
];

export default function ModelSelector({
  value,
  onChange,
  models = DEFAULT_MODELS
}: {
  value: string;
  onChange: (modelId: string) => void;
  models?: ModelInfo[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === value) || models[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  return (
    <div className="model-selector" ref={ref}>
      <button
        type="button"
        className="model-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <Cpu size={16} />
        <span>{selected.name}</span>
        {selected.badge ? <span className="badge">{selected.badge}</span> : null}
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="model-dropdown">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`model-dropdown-item${model.id === value ? " selected" : ""}`}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
            >
              <span className="model-name">
                {model.name}
                {model.badge ? <span className="badge" style={{ marginLeft: 8 }}>{model.badge}</span> : null}
              </span>
              <span className="model-desc">{model.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
