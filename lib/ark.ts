/**
 * 火山方舟 API 通信层
 *
 * 负责：
 * 1. 构建 API 请求体（buildArkPayload）
 * 2. 通过多种策略请求上游 API（Node HTTP / curl / PowerShell）
 * 3. 将上游响应标准化为统一格式（normalizeArkTaskResponse）
 *
 * 为什么需要多种 HTTP 策略？
 * - Windows 上 Node.js 原生 HTTP 可能超时/断开
 * - curl 更稳定，作为 Windows 首选
 * - PowerShell 作为最终兜底方案
 */

import type { ArkTaskResponse, CreateGenerationRequest } from "./types";
import { execFile } from "child_process";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { promisify } from "util";
import {
  assertCompatibleGateway,
  getArkApiKey,
  getArkBaseUrl,
  getArkCreateTaskPath,
  getArkModelId,
  getArkQueryTaskPath
} from "./config";

const execFileAsync = promisify(execFile);

type AnyRecord = Record<string, unknown>;

/** 辅助：判断值是否为普通对象 */
function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 辅助：安全地将值转为字符串（数字也转） */
function getString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** 辅助：提取 http/https URL */
function getUrl(value: unknown) {
  const text = getString(value);
  return text && /^https?:\/\//i.test(text) ? text : undefined;
}

/**
 * 在响应体中递归查找字符串字段
 * 为什么用递归？不同代理/版本响应格式不同，video_url 可能在 data.video_url 或直接在顶层
 */
function findString(source: unknown, keys: string[]): string | undefined {
  if (!isRecord(source)) return undefined;
  for (const key of keys) {
    const direct = getString(source[key]);
    if (direct) return direct;
  }
  // 如果顶层没找到，递归到常见嵌套层找
  for (const key of ["data", "result", "content", "output"]) {
    const nested = findString(source[key], keys);
    if (nested) return nested;
  }
  return undefined;
}

/** 在响应体中递归查找 URL 字段 */
function findUrl(source: unknown, keys: string[]): string | undefined {
  if (!isRecord(source)) return undefined;
  for (const key of keys) {
    const direct = getUrl(source[key]);
    if (direct) return direct;
  }
  for (const key of ["data", "result", "content", "output"]) {
    const nested = findUrl(source[key], keys);
    if (nested) return nested;
  }
  return undefined;
}

/**
 * 构建发送给视频生成 API 的请求体
 * 将前端表单数据转换为 API 要求的格式
 */
export function buildArkPayload(input: CreateGenerationRequest) {
  const referenceImages: string[] = [];
  const referenceVideos: string[] = [];
  const referenceAudios: string[] = [];

  // 按类型分类媒体素材
  for (const media of input.media) {
    if (media.type === "image_url") {
      referenceImages.push(media.url);
    }
    if (media.type === "video_url") {
      referenceVideos.push(media.url);
    }
    if (media.type === "audio_url") {
      referenceAudios.push(media.url);
    }
  }

  // 基础参数
  const metadata: Record<string, unknown> = {
    reference_images: referenceImages,
    reference_videos: referenceVideos,
    reference_audios: referenceAudios,
    generate_audio: input.options.generateAudio,
    ratio: input.options.ratio,
    duration: input.options.duration,
    resolution: input.options.resolution,
    watermark: input.options.watermark
  };

  // 高级参数 —— 按火山方舟官方 API 字段名
  if (input.options.negativePrompt) {
    metadata.negative_prompt = input.options.negativePrompt;
  }
  if (input.options.guideScale !== undefined) {
    metadata.guide_scale = input.options.guideScale;
  }
  if (input.options.style) {
    metadata.style = input.options.style;
  }
  if (input.options.cameraMotion) {
    metadata.camera_motion = input.options.cameraMotion;
  }

  return {
    model: getArkModelId(),
    prompt: input.prompt,
    metadata
  };
}

/**
 * 状态标准化
 * 不同 API 返回的状态字段值不一致（有的返回 "success"，有的返回 "succeeded"）
 * 这里统一映射为内部使用的状态枚举
 */
function normalizeStatus(value: string | undefined): ArkTaskResponse["status"] {
  if (!value) return "queued";
  const normalized = value.toLowerCase();
  if (["queued", "pending", "created", "waiting", "submitted", "accepted", "starting"].includes(normalized)) return "queued";
  if (["running", "processing", "in_progress", "generating", "started"].includes(normalized)) return "running";
  if (["succeeded", "success", "completed", "complete", "done"].includes(normalized)) return "succeeded";
  if (["failed", "failure", "error"].includes(normalized)) return "failed";
  if (["cancelled", "canceled"].includes(normalized)) return "cancelled";
  if (normalized === "expired") return "expired";
  return "unknown";
}

/**
 * 将上游 API 响应标准化为 ArkTaskResponse 格式
 * 无论上游返回什么字段名，最终都映射为统一结构
 */
function normalizeArkTaskResponse(data: unknown, fallbackId?: string): ArkTaskResponse {
  // 提取任务 ID：尝试多种可能的字段名
  const id = findString(data, ["task_id", "taskId", "id", "generation_id", "generationId"]) || fallbackId || "";
  const status = normalizeStatus(findString(data, ["status", "state", "task_status", "taskStatus"]));

  // 提取视频地址：兼容各种字段名
  const videoUrl = findUrl(data, [
    "video_url",
    "videoUrl",
    "url",
    "file_url",
    "fileUrl",
    "output_url",
    "outputUrl",
    "result_url",
    "resultUrl"
  ]);
  const lastFrameUrl = findUrl(data, ["last_frame_url", "lastFrameUrl"]);

  const response: ArkTaskResponse = {
    id,
    model: getArkModelId(),
    status,
    content: {
      video_url: videoUrl,
      last_frame_url: lastFrameUrl
    }
  };

  // 补充其他可选字段
  if (isRecord(data)) {
    response.error = data.error || findString(data, ["fail_reason", "failReason", "message"]);
    const createdAt = Number(data.created_at ?? data.createdAt);
    const updatedAt = Number(data.updated_at ?? data.updatedAt);
    const duration = Number(data.duration);
    if (Number.isFinite(createdAt)) response.created_at = createdAt;
    if (Number.isFinite(updatedAt)) response.updated_at = updatedAt;
    if (Number.isFinite(duration)) response.duration = duration;
    response.ratio = getString(data.ratio);
    response.resolution = getString(data.resolution);
    response.progress = findString(data, ["progress", "percentage", "percent"]);
  }

  return response;
}

/** 解析响应文本：JSON 就解析，否则原样返回 */
function parseResponseText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ──────────────────────────────────────────────
// 三种 HTTP 请求策略
// ──────────────────────────────────────────────

/** 策略 1：Node.js 原生 HTTP（非 Windows 平台首选） */
async function requestJson(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const target = new URL(url);
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  const client = target.protocol === "http:" ? httpRequest : httpsRequest;

  return new Promise<unknown>((resolve, reject) => {
    const request = client(
      target,
      {
        method: init.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getArkApiKey()}`,
          ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {})
        },
        timeout: 5000
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const data = parseResponseText(text);
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(typeof data === "string" ? data : JSON.stringify(data)));
            return;
          }
          resolve(data);
        });
      }
    );

    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

/** PowerShell 字符串转义：单引号内的单引号要写成两个 */
function psQuote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

/** 策略 2：PowerShell Invoke-WebRequest（兜底方案） */
async function requestJsonWithPowerShell(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const body = init.body === undefined ? "" : JSON.stringify(init.body);
  const script = [
    `$headers=@{Authorization=${psQuote(`Bearer ${getArkApiKey()}`)};'Content-Type'='application/json'}`,
    init.method === "POST"
      ? `$body=${psQuote(body)}; (Invoke-WebRequest -UseBasicParsing -Uri ${psQuote(url)} -Method POST -Headers $headers -Body $body -TimeoutSec 60).Content`
      : `(Invoke-WebRequest -UseBasicParsing -Uri ${psQuote(url)} -Method GET -Headers $headers -TimeoutSec 60).Content`
  ].join("; ");

  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script], {
    timeout: 75000,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 4
  });
  return parseResponseText(stdout);
}

/** 策略 3：curl（跨平台稳定 HTTP 客户端） */
/** 根据平台获取 curl 的二进制名称 */
function curlBinary() {
  return process.platform === "win32" ? "curl.exe" : "curl";
}

/** curl 的 execFile 公共选项 */
function curlExecOptions(timeoutMs: number) {
  const opts: Record<string, unknown> = {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 8
  };
  if (process.platform === "win32") {
    opts.windowsHide = true;
  }
  return opts;
}

async function requestJsonWithCurl(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  const args = [
    "-sS",                // 静默模式 + 出错时显示错误
    "--connect-timeout", "20",
    "--max-time", "90",
    "-w", "\n%{http_code}", // 在输出末尾附加 HTTP 状态码
    "-H", `Authorization: Bearer ${getArkApiKey()}`,
    "-X", init.method,
    url
  ];

  if (body) {
    args.push("-H", "Content-Type: application/json");
    args.push("--data-binary", body);
  }

  const { stdout } = await execFileAsync(curlBinary(), args, curlExecOptions(100000));
  // curl -w 输出的最后 3 位是 HTTP 状态码
  const status = Number(stdout.slice(-3));
  const text = stdout.slice(0, -4);
  const data = parseResponseText(text);
  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

/**
 * 选择请求策略的网关函数
 * - Windows → curl（最稳定）
 * - Linux/macOS → Node HTTP 首选，失败降级到 curl
 */
async function requestGatewayJson(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  if (process.platform === "win32") {
    return requestJsonWithCurl(url, init);
  }

  try {
    return await requestJson(url, init);
  } catch (error) {
    // Node HTTP 失败 → 降级到 curl（Linux 上 PowerShell 不存在）
    if (error instanceof Error && /timed out|socket hang up|ECONNRESET|ETIMEDOUT/i.test(error.message)) {
      return requestJsonWithCurl(url, init);
    }
    throw error;
  }
}

// ──────────────────────────────────────────────
// 对外暴露的两个核心函数
// ──────────────────────────────────────────────

/** 创建视频生成任务 */
export async function createArkTask(input: CreateGenerationRequest) {
  assertCompatibleGateway();  // 安全检查：确保 Key 和 Base URL 匹配
  const data = await requestGatewayJson(`${getArkBaseUrl()}${getArkCreateTaskPath()}`, {
    method: "POST",
    body: buildArkPayload(input)
  });
  return normalizeArkTaskResponse(data);
}

/** 查询任务状态 */
export async function getArkTask(taskId: string) {
  assertCompatibleGateway();
  const data = await requestGatewayJson(`${getArkBaseUrl()}${getArkQueryTaskPath(taskId)}`, {
    method: "GET"
  });
  return normalizeArkTaskResponse(data, taskId);
}
