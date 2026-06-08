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
  Video
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { CreationMode } from "./sidebar";


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

export default function Composer({
  mode,
  prompt,
  onPromptChange,
  imageUrl,
  onImageUrlChange,
  videoUrl,
  onVideoUrlChange,
  audioUrl,
  onAudioUrlChange,
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
  imageUrl: string;
  onImageUrlChange: (value: string) => void;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  audioUrl: string;
  onAudioUrlChange: (value: string) => void;
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

      {/* 媒体 URL 输入 */}
      <div className="media-section">
        <span className="media-section-label">参考素材（公网 URL）</span>
        <div className="media-urls">
          <div className="media-url-field">
            <label>
              <ImageIcon size={14} style={{ verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
              图片 URL
            </label>
            <input
              value={imageUrl}
              onChange={(event) => onImageUrlChange(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="media-url-field">
            <label>
              <Video size={14} style={{ verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
              视频 URL
            </label>
            <input
              value={videoUrl}
              onChange={(event) => onVideoUrlChange(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="media-url-field">
            <label>
              <MusicIcon size={14} style={{ verticalAlign: "middle", marginRight: 4 }} aria-hidden="true" />
              音频 URL
            </label>
            <input
              value={audioUrl}
              onChange={(event) => onAudioUrlChange(event.target.value)}
              placeholder="https://..."
            />
          </div>
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
