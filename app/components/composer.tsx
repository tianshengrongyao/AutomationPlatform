/**
 * 中央创作区
 * Agent 对话式输入框 + /斜杠命令面板 + 高级参数 + 生成按钮
 */

"use client";

import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Music as MusicIcon,
  Play,
  Settings2,
  Upload,
  Video,
  X
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { CreationMode } from "./sidebar";

/** 单个媒体输入的状态 */
export type MediaEntry = {
  url: string;         // URL 模式的输入值 / 上传后返回的服务端 URL
  file: File | null;   // 待上传的文件对象（上传模式用）
  mode: "url" | "upload";
};


/* ---- Slash command types ---- */
type SlashCommand = {
  command: string;
  label: string;
  description: string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/ratio", label: "比例", description: "设置视频比例，如 /ratio 9:16" },
  { command: "/duration", label: "时长", description: "设置视频时长(秒)，如 /duration 5" },
  { command: "/camera", label: "运镜", description: "设置运镜方式，如 /camera 推镜" },
  { command: "/style", label: "风格", description: "设置画面风格，如 /style 电影感" },
  { command: "/negative", label: "负向提示词", description: "排除不希望出现的元素" },
  { command: "/seed", label: "随机种子", description: "设置随机种子，如 /seed 42" }
];

/**
 * 单个媒体上传行
 * 纯上传模式：点击选择文件 → 显示文件信息 → 可移除
 */
function MediaField({
  icon,
  label,
  entry,
  onChange,
  accept,
}: {
  icon: React.ReactNode;
  label: string;
  entry: MediaEntry;
  onChange: (entry: MediaEntry) => void;
  accept: string;
}) {
  return (
    <div className="media-url-field">
      <label>
        {icon}
        {label}
      </label>

      {entry.file ? (
        <div className="media-file-info">
          <span className="media-file-name" title={entry.file.name}>
            {entry.file.name}
          </span>
          <span className="media-file-size">{formatFileSize(entry.file.size)}</span>
          <button
            type="button"
            className="media-file-remove"
            onClick={() => onChange({ ...entry, file: null, url: "" })}
            title="移除文件"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="media-file-picker">
          <Upload size={14} />
          选择{label}文件
          <input
            type="file"
            accept={accept}
            className="media-file-input-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange({ ...entry, file, url: "" });
              }
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

/** 文件大小友好显示 */
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Composer({
  mode,
  prompt,
  onPromptChange,
  image,
  onImageChange,
  video,
  onVideoChange,
  audio,
  onAudioChange,
  duration,
  onDurationChange,
  resolution,
  onResolutionChange,
  generateAudio,
  onGenerateAudioChange,
  watermark,
  onWatermarkChange,
  returnLastFrame,
  onReturnLastFrameChange,
  seed,
  onSeedChange,
  priority,
  onPriorityChange,
  negativePrompt,
  onNegativePromptChange,
  guideScale,
  onGuideScaleChange,
  submitting,
  onSubmit
}: {
  mode: CreationMode;
  prompt: string;
  onPromptChange: (value: string) => void;
  image: MediaEntry;
  onImageChange: (entry: MediaEntry) => void;
  video: MediaEntry;
  onVideoChange: (entry: MediaEntry) => void;
  audio: MediaEntry;
  onAudioChange: (entry: MediaEntry) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  generateAudio: boolean;
  onGenerateAudioChange: (value: boolean) => void;
  watermark: boolean;
  onWatermarkChange: (value: boolean) => void;
  returnLastFrame: boolean;
  onReturnLastFrameChange: (value: boolean) => void;
  seed: number;
  onSeedChange: (value: number) => void;
  priority: number;
  onPriorityChange: (value: number) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  guideScale: number;
  onGuideScaleChange: (value: number) => void;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    index: number;
    commands: SlashCommand[];
  }>({ open: false, index: 0, commands: SLASH_COMMANDS });
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePromptChange = useCallback(
    (value: string) => {
      onPromptChange(value);

      // Check for slash command trigger
      const cursorPos = textareaRef.current?.selectionStart || value.length;
      const textBefore = value.slice(0, cursorPos);
      const slashMatch = textBefore.match(/\/(\w*)$/);

      if (slashMatch) {
        const query = slashMatch[1].toLowerCase();
        const filtered = SLASH_COMMANDS.filter(
          (c) => c.command.includes(query) || c.label.includes(query)
        );
        setSlashMenu({ open: true, index: slashMatch.index || 0, commands: filtered });
        setHighlightedIdx(0);
      } else {
        setSlashMenu({ open: false, index: 0, commands: [] });
      }
    },
    [onPromptChange]
  );

  const applySlashCommand = useCallback(
    (command: SlashCommand) => {
      const text = prompt;
      const before = text.slice(0, slashMenu.index);
      const after = text.slice(textareaRef.current?.selectionStart || slashMenu.index);
      const replacement = `${command.command} `;
      const newText = before + replacement + after;
      onPromptChange(newText);
      setSlashMenu({ open: false, index: 0, commands: [] });
      textareaRef.current?.focus();
    },
    [prompt, slashMenu.index, onPromptChange]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!slashMenu.open) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIdx((i) => Math.min(i + 1, slashMenu.commands.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIdx((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        if (slashMenu.commands[highlightedIdx]) {
          applySlashCommand(slashMenu.commands[highlightedIdx]);
        }
      } else if (event.key === "Escape") {
        setSlashMenu({ open: false, index: 0, commands: [] });
      }
    },
    [slashMenu, highlightedIdx, applySlashCommand]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer-header">
        <h2>{mode === "text-to-video" ? "文生视频" : "图生视频"}</h2>
        <p>
          {mode === "text-to-video"
            ? "输入文字描述，AI 为你生成动态视频。支持 / 命令快捷调参。"
            : "上传参考图片，AI 将静态画面转化为动态视频。"}
        </p>
      </div>

      {/* Agent 输入框 */}
      <div className="agent-input-wrap">
        <textarea
          ref={textareaRef}
          className="agent-textarea"
          value={prompt}
          onChange={(event) => handlePromptChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "text-to-video"
              ? "输入想法、脚本或镜头描述。输入 / 使用快捷命令...\n例如：一支未来感咖啡广告，第一人称视角，雨夜霓虹街头..."
              : "描述你想要的动态效果。输入 / 使用快捷命令...\n例如：微风吹过，头发和衣角轻轻飘动，阳光透过树叶洒下斑驳光影..."
          }
        />
        <span className="agent-hint">输入 / 查看命令</span>

        {/* 斜杠命令面板 */}
        {slashMenu.open && slashMenu.commands.length > 0 ? (
          <div className="slash-menu">
            {slashMenu.commands.map((cmd, idx) => (
              <button
                key={cmd.command}
                type="button"
                className={`slash-menu-item${idx === highlightedIdx ? " highlighted" : ""}`}
                onClick={() => applySlashCommand(cmd)}
              >
                <Settings2 size={14} />
                <span>
                  <strong>{cmd.command}</strong> {cmd.label}
                </span>
                <span>{cmd.description.split("，")[0]}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 媒体输入：支持 URL / 本地上传 */}
      <div className="media-section">
        <span className="media-section-label">参考素材</span>
        <div className="media-urls">
          {/* ---- 图片 ---- */}
          <MediaField
            icon={<ImageIcon size={14} />}
            label="图片"
            entry={image}
            onChange={onImageChange}
            accept="image/*"
          />

          {/* ---- 视频 ---- */}
          <MediaField
            icon={<Video size={14} />}
            label="视频"
            entry={video}
            onChange={onVideoChange}
            accept="video/*"
          />

          {/* ---- 音频 ---- */}
          <MediaField
            icon={<MusicIcon size={14} />}
            label="音频"
            entry={audio}
            onChange={onAudioChange}
            accept="audio/*"
          />
        </div>
      </div>

      {/* 高级参数 */}
      <div>
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          高级参数
        </button>

        {showAdvanced ? (
          <div className="advanced-panel" style={{ marginTop: 8 }}>
            <div className="advanced-field">
              <label>分辨率</label>
              <select value={resolution} onChange={(e) => onResolutionChange(e.target.value)}>
                {["480p", "720p", "1080p"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="advanced-field">
              <label>时长（秒）</label>
              <input
                type="number"
                min={-1}
                max={15}
                value={duration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
              />
            </div>
            <div className="advanced-field">
              <label>优先级 (0-9)</label>
              <input
                type="number"
                min={0}
                max={9}
                value={priority}
                onChange={(e) => onPriorityChange(Number(e.target.value))}
              />
            </div>
            <div className="advanced-field">
              <label>随机种子 (-1=随机)</label>
              <input
                type="number"
                min={-1}
                value={seed}
                onChange={(e) => onSeedChange(Number(e.target.value))}
              />
            </div>
            <div className="advanced-field">
              <label>引导系数 (1-10)</label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={guideScale}
                onChange={(e) => onGuideScaleChange(Number(e.target.value))}
              />
            </div>
            <div className="advanced-field">
              <label>负向提示词</label>
              <input
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange(e.target.value)}
                placeholder="排除的内容..."
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--color-ink-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={generateAudio}
            onChange={(e) => onGenerateAudioChange(e.target.checked)}
          />
          生成同步音频
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--color-ink-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={watermark}
            onChange={(e) => onWatermarkChange(e.target.checked)}
          />
          添加水印
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--color-ink-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={returnLastFrame}
            onChange={(e) => onReturnLastFrameChange(e.target.checked)}
          />
          返回尾帧
        </label>
      </div>

      {/* 生成按钮 */}
      <div className="generate-bar">
        <span className="credit-info">每日额度充足</span>
        <button type="submit" className="generate-btn" disabled={submitting || !prompt.trim()}>
          {submitting ? (
            <>
              <span className="spin" style={{ display: "inline-block", width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
              生成中...
            </>
          ) : (
            <>
              <Play size={18} />
              生成视频
            </>
          )}
        </button>
      </div>
    </form>
  );
}
