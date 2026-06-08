/**
 * 本地视频缓存
 *
 * 为什么需要这个？
 * 视频生成 API 返回的视频 URL 是有有效期的（通常 24 小时）
 * 如果不下载到本地，链接过期后视频就看不到了
 *
 * 这个模块负责：检测远程视频 → 下载到 public/generated-videos/ → 把本地地址替换到响应中
 */

import { createWriteStream } from "fs";
import { access, mkdir, rename, unlink } from "fs/promises";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import path from "path";
import { pipeline } from "stream/promises";
import type { ArkTaskResponse } from "./types";

/** 视频存放目录 */
const VIDEO_DIR = path.join(process.cwd(), "public", "generated-videos");

/** 判断是否为远程 URL */
function isRemoteUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

/** 根据任务 ID 生成本地路径（安全：过滤非法字符） */
function localVideoPath(taskId: string) {
  const safeId = taskId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    publicUrl: `/generated-videos/${safeId}.mp4`,   // 前端访问路径
    filePath: path.join(VIDEO_DIR, `${safeId}.mp4`), // 磁盘绝对路径
    tempPath: path.join(VIDEO_DIR, `${safeId}.mp4.tmp`) // 下载时的临时文件
  };
}

/** 检查文件是否存在 */
async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 下载文件到本地（支持重定向追踪，最多 3 层）
 * 先写到 .tmp 临时文件，下载完成再 rename，保证原子性
 */
async function downloadFile(url: string, filePath: string, tempPath: string, redirects = 0): Promise<void> {
  if (redirects > 3) throw new Error("视频下载重定向次数过多。");

  await mkdir(VIDEO_DIR, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "http:" ? httpRequest : httpsRequest;
    const request = client(target, { timeout: 120000 }, async (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

      // 处理重定向
      if (status >= 300 && status < 400 && location) {
        response.resume();
        try {
          const nextUrl = new URL(location, url).toString();
          await downloadFile(nextUrl, filePath, tempPath, redirects + 1);
          resolve();
        } catch (error) {
          reject(error);
        }
        return;
      }

      // HTTP 错误
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`下载视频失败，远程服务器返回 ${status}。`));
        return;
      }

      // 流式写入临时文件
      const output = createWriteStream(tempPath);
      pipeline(response, output)
        .then(async () => {
          await rename(tempPath, filePath);  // 下载完成 → 原子 rename
          resolve();
        })
        .catch(async (error) => {
          await unlink(tempPath).catch(() => undefined); // 失败清理临时文件
          reject(error);
        });
    });

    request.on("timeout", () => request.destroy(new Error("下载视频超时。")));
    request.on("error", reject);
    request.end();
  });
}

/**
 * 如果任务已完成且有视频 URL，尝试下载到本地
 * 已下载过的会跳过（检查文件是否存在）
 */
export async function saveTaskVideoLocally(response: ArkTaskResponse) {
  const remoteUrl = response.content?.video_url;
  if (response.status !== "succeeded" || !response.id || !isRemoteUrl(remoteUrl)) {
    return response;  // 不需要处理的情况：未完成 / 无 ID / 已是本地 URL
  }

  const sourceUrl = remoteUrl;
  const { publicUrl, filePath, tempPath } = localVideoPath(response.id);

  // 文件已存在则跳过下载
  if (!(await exists(filePath))) {
    await downloadFile(sourceUrl, filePath, tempPath);
  }

  // 替换为本地地址，同时保留远程原始地址
  return {
    ...response,
    content: {
      ...response.content,
      remote_video_url: response.content?.remote_video_url || sourceUrl,  // 原始远程地址
      local_video_url: publicUrl,   // 本地缓存地址
      video_url: publicUrl          // 前端默认走本地
    }
  };
}
