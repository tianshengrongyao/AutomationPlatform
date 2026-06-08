"use client";

import {
  LogOut,
  Menu,
  Wand2
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { CreateGenerationRequest, StoredTask } from "@/lib/types";
import type { CreationMode } from "./sidebar";
import { CAMERA_PRESETS, STYLE_PRESETS } from "./camera-presets";
import Composer from "./composer";
import Gallery from "./gallery";
import ModelSelector from "./model-selector";
import ResultPanel from "./result-panel";
import Sidebar from "./sidebar";
import ThemeToggle from "./theme-toggle";

type ViewMode = "create" | "gallery";
type Notice = { tone: "ok" | "error" | "info"; text: string } | null;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detailText =
      typeof data.details === "string"
        ? data.details
        : data.details
          ? JSON.stringify(data.details)
          : "";
    throw new Error(
      detailText ? `${data.error || "请求失败。"} ${detailText}` : data.error || "请求失败。"
    );
  }
  return data as T;
}

function isActiveTask(task?: StoredTask) {
  if (!task) return false;
  return !["cancelled", "succeeded", "failed", "expired"].includes(task.status);
}

export default function AppShell({
  onLogout,
  tasks,
  setTasks
}: {
  onLogout: () => Promise<void>;
  tasks: StoredTask[];
  setTasks: React.Dispatch<React.SetStateAction<StoredTask[]>>;
}) {
  // ---- View state ----
  const [view, setView] = useState<ViewMode>("create");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Creation state ----
  const [mode, setMode] = useState<CreationMode>("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [resolution, setResolution] = useState("1080p");
  const [duration, setDuration] = useState(5);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [returnLastFrame, setReturnLastFrame] = useState(false);
  const [seed, setSeed] = useState(-1);
  const [priority, setPriority] = useState(0);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [guideScale, setGuideScale] = useState(7);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [modelId, setModelId] = useState("seedance-2.0-1080");

  // ---- Task state ----
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  // ---- Notice auto-dismiss ----
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // ---- Load tasks ----
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<{ tasks: StoredTask[] }>("/api/generations");
      setTasks(data.tasks);
      setSelectedTaskId((current) => current || data.tasks[0]?.id || null);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "读取任务失败。" });
    } finally {
      setLoading(false);
    }
  }, [setTasks]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // ---- Auto-poll active tasks ----
  useEffect(() => {
    if (!tasks.some(isActiveTask)) return;
    const timer = window.setInterval(() => {
      for (const task of tasks.filter(isActiveTask)) {
        void refreshTask(task.id, false);
      }
    }, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  // ---- Refresh single task ----
  async function refreshTask(taskId: string, showNotice = true) {
    try {
      const data = await fetchJson<{ task: StoredTask }>(
        `/api/generations/${encodeURIComponent(taskId)}`
      );
      setTasks((current) =>
        current.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
      );
      if (showNotice) setNotice({ tone: "ok", text: "任务状态已更新。" });
    } catch (error) {
      if (showNotice) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "查询任务失败。" });
      }
    }
  }

  // ---- Copy task ID ----
  async function copyTaskId(taskId: string) {
    await navigator.clipboard.writeText(taskId);
    setNotice({ tone: "info", text: "任务 ID 已复制。" });
  }

  // ---- Delete task ----
  async function removeTask(taskId: string) {
    if (!window.confirm("确定从历史记录里删除这个任务吗？")) return;
    setDeletingTaskId(taskId);
    setNotice(null);
    try {
      await fetchJson<{ ok: true }>(`/api/generations/${encodeURIComponent(taskId)}`, {
        method: "DELETE"
      });
      setTasks((current) => {
        const next = current.filter((t) => t.id !== taskId);
        if (selectedTaskId === taskId) {
          setSelectedTaskId(next[0]?.id || null);
        }
        return next;
      });
      setNotice({ tone: "ok", text: "任务历史已删除。" });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "删除任务失败。" });
    } finally {
      setDeletingTaskId(null);
    }
  }

  // ---- Build and submit ----
  function buildRequest(): CreateGenerationRequest {
    // 构建带运镜和风格前缀的完整 prompt
    const cameraPreset = CAMERA_PRESETS.find((p) => p.id === selectedCamera);
    const stylePreset = STYLE_PRESETS.find((p) => p.id === selectedStyle);
    const prefixParts: string[] = [];
    if (cameraPreset) prefixParts.push(cameraPreset.promptPrefix);
    if (stylePreset) prefixParts.push(stylePreset.promptPrefix);
    const finalPrompt = [...prefixParts, prompt].filter(Boolean).join("\n");

    const negativePrefix = negativePrompt.trim() ? `排除以下内容：${negativePrompt.trim()}` : "";
    const fullPrompt = [finalPrompt, negativePrefix].filter(Boolean).join("\n");

    return {
      prompt: fullPrompt,
      media: [],
      uploadedImages: [],
      options: {
        ratio,
        resolution,
        duration,
        generateAudio,
        watermark,
        returnLastFrame,
        seed: seed === -1 ? undefined : seed,
        priority,
        negativePrompt: negativePrompt.trim() || undefined,
        guideScale: guideScale,
        style: stylePreset ? stylePreset.promptPrefix : undefined,
        cameraMotion: cameraPreset ? cameraPreset.promptPrefix : undefined
      }
    };
  }

  async function submitTask() {
    setSubmitting(true);
    setNotice(null);
    try {
      const data = await fetchJson<{ task: StoredTask }>("/api/generations", {
        method: "POST",
        body: JSON.stringify(buildRequest())
      });
      setTasks((current) => [data.task, ...current.filter((t) => t.id !== data.task.id)]);
      setSelectedTaskId(data.task.id);
      setView("create"); // switch back to create view to see result
      if (isActiveTask(data.task)) {
        window.setTimeout(() => void refreshTask(data.task.id, false), 1000);
      }
      setNotice({ tone: "ok", text: "任务已提交，右侧会自动刷新状态。" });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "创建任务失败。"
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Gallery "做同款" ----
  function useTemplate(task: StoredTask) {
    setPrompt(task.prompt);
    setRatio(task.request.options.ratio);
    setResolution(task.request.options.resolution);
    setDuration(task.request.options.duration);
    setGenerateAudio(task.request.options.generateAudio);
    setWatermark(task.request.options.watermark);
    setReturnLastFrame(task.request.options.returnLastFrame);
    setSeed(task.request.options.seed ?? -1);
    setPriority(task.request.options.priority);
    setView("create");
    setNotice({ tone: "info", text: "已加载模板参数，可直接生成或修改后提交。" });
  }

  // ---- Gallery preview ----
  function previewInResult(taskId: string) {
    setSelectedTaskId(taskId);
    setView("create");
  }

  return (
    <main className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          {/* Mobile menu button */}
          <button
            type="button"
            className="ghost-button mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <div className="topbar-brand">
            <Image src="/brand-logo.png" alt="Seedance" width={34} height={34} priority />
            <span className="brand-text">Seedance</span>
          </div>

          <ModelSelector value={modelId} onChange={setModelId} />
        </div>

        <div className="topbar-center">
          <div className="view-tabs">
            <button
              type="button"
              className={`view-tab${view === "create" ? " active" : ""}`}
              onClick={() => setView("create")}
            >
              <Wand2 size={14} />
              创作
            </button>
            <button
              type="button"
              className={`view-tab${view === "gallery" ? " active" : ""}`}
              onClick={() => setView("gallery")}
            >
              画廊
            </button>
          </div>
        </div>

        <div className="topbar-right">
          <ThemeToggle />
          <button className="ghost-button" type="button" onClick={onLogout}>
            <LogOut size={16} />
            退出
          </button>
        </div>
      </header>

      {/* Body */}
      {view === "create" ? (
        <div className="workspace-body">
          <Sidebar
            mode={mode}
            onModeChange={setMode}
            ratio={ratio}
            onRatioChange={setRatio}
            selectedCamera={selectedCamera}
            selectedStyle={selectedStyle}
            onSelectCamera={setSelectedCamera}
            onSelectStyle={setSelectedStyle}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />

          <Composer
            mode={mode}
            prompt={prompt}
            onPromptChange={setPrompt}
            duration={duration}
            onDurationChange={setDuration}
            resolution={resolution}
            onResolutionChange={setResolution}
            generateAudio={generateAudio}
            onGenerateAudioChange={setGenerateAudio}
            watermark={watermark}
            onWatermarkChange={setWatermark}
            returnLastFrame={returnLastFrame}
            onReturnLastFrameChange={setReturnLastFrame}
            seed={seed}
            onSeedChange={setSeed}
            priority={priority}
            onPriorityChange={setPriority}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
            guideScale={guideScale}
            onGuideScaleChange={setGuideScale}
            submitting={submitting}
            onSubmit={submitTask}
          />

          <ResultPanel
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            onRefreshTask={refreshTask}
            onCopyTaskId={copyTaskId}
            onRemoveTask={removeTask}
            deletingTaskId={deletingTaskId}
          />
        </div>
      ) : (
        <Gallery
          tasks={tasks}
          onUseTemplate={useTemplate}
          onPreview={previewInResult}
        />
      )}

      {/* Notice / Toast */}
      {notice ? (
        <div className={`notice ${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
          <div>
            <strong>
              {notice.tone === "error" ? "操作失败" : notice.tone === "ok" ? "操作成功" : "提示"}
            </strong>
            <span>{notice.text}</span>
          </div>
          <button type="button" onClick={() => setNotice(null)} aria-label="关闭提示">
            ✕
          </button>
        </div>
      ) : null}
    </main>
  );
}
