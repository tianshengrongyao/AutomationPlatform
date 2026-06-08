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

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getUrl(value: unknown) {
  const text = getString(value);
  return text && /^https?:\/\//i.test(text) ? text : undefined;
}

function findString(source: unknown, keys: string[]): string | undefined {
  if (!isRecord(source)) return undefined;
  for (const key of keys) {
    const direct = getString(source[key]);
    if (direct) return direct;
  }
  for (const key of ["data", "result", "content", "output"]) {
    const nested = findString(source[key], keys);
    if (nested) return nested;
  }
  return undefined;
}

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

export function buildArkPayload(input: CreateGenerationRequest) {
  const referenceImages: string[] = [];
  const referenceVideos: string[] = [];
  const referenceAudios: string[] = [];

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

  // 新增参数 —— 按火山方舟官方 API 字段名
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

function normalizeArkTaskResponse(data: unknown, fallbackId?: string): ArkTaskResponse {
  const id = findString(data, ["task_id", "taskId", "id", "generation_id", "generationId"]) || fallbackId || "";
  const status = normalizeStatus(findString(data, ["status", "state", "task_status", "taskStatus"]));
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

function parseResponseText(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

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

function psQuote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

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

async function requestJsonWithCurl(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  const args = [
    "-sS",
    "--connect-timeout",
    "20",
    "--max-time",
    "90",
    "-w",
    "\n%{http_code}",
    "-H",
    `Authorization: Bearer ${getArkApiKey()}`,
    "-X",
    init.method,
    url
  ];

  if (body) {
    args.push("-H", "Content-Type: application/json");
    args.push("--data-binary", body);
  }

  const { stdout } = await execFileAsync("curl.exe", args, {
    timeout: 100000,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 8
  });
  const status = Number(stdout.slice(-3));
  const text = stdout.slice(0, -4);
  const data = parseResponseText(text);
  if (!Number.isFinite(status) || status < 200 || status >= 300) {
    throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  }
  return data;
}

async function requestGatewayJson(url: string, init: { method: "GET" | "POST"; body?: unknown }) {
  if (process.platform === "win32") {
    return requestJsonWithCurl(url, init);
  }

  try {
    return await requestJson(url, init);
  } catch (error) {
    if (error instanceof Error && /timed out|socket hang up|ECONNRESET|ETIMEDOUT/i.test(error.message)) {
      return requestJsonWithPowerShell(url, init);
    }
    throw error;
  }
}

export async function createArkTask(input: CreateGenerationRequest) {
  assertCompatibleGateway();
  const data = await requestGatewayJson(`${getArkBaseUrl()}${getArkCreateTaskPath()}`, {
    method: "POST",
    body: buildArkPayload(input)
  });
  return normalizeArkTaskResponse(data);
}

export async function getArkTask(taskId: string) {
  assertCompatibleGateway();
  const data = await requestGatewayJson(`${getArkBaseUrl()}${getArkQueryTaskPath(taskId)}`, {
    method: "GET"
  });
  return normalizeArkTaskResponse(data, taskId);
}
