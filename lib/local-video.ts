import { createWriteStream } from "fs";
import { access, mkdir, rename, unlink } from "fs/promises";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import path from "path";
import { pipeline } from "stream/promises";
import type { ArkTaskResponse } from "./types";

const VIDEO_DIR = path.join(process.cwd(), "public", "generated-videos");

function isRemoteUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

function localVideoPath(taskId: string) {
  const safeId = taskId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    publicUrl: `/generated-videos/${safeId}.mp4`,
    filePath: path.join(VIDEO_DIR, `${safeId}.mp4`),
    tempPath: path.join(VIDEO_DIR, `${safeId}.mp4.tmp`)
  };
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url: string, filePath: string, tempPath: string, redirects = 0): Promise<void> {
  if (redirects > 3) throw new Error("视频下载重定向次数过多。");

  await mkdir(VIDEO_DIR, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "http:" ? httpRequest : httpsRequest;
    const request = client(target, { timeout: 120000 }, async (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;

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

      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`下载视频失败，远程服务器返回 ${status}。`));
        return;
      }

      const output = createWriteStream(tempPath);
      pipeline(response, output)
        .then(async () => {
          await rename(tempPath, filePath);
          resolve();
        })
        .catch(async (error) => {
          await unlink(tempPath).catch(() => undefined);
          reject(error);
        });
    });

    request.on("timeout", () => request.destroy(new Error("下载视频超时。")));
    request.on("error", reject);
    request.end();
  });
}

export async function saveTaskVideoLocally(response: ArkTaskResponse) {
  const remoteUrl = response.content?.video_url;
  if (response.status !== "succeeded" || !response.id || !isRemoteUrl(remoteUrl)) {
    return response;
  }

  const sourceUrl = remoteUrl;
  const { publicUrl, filePath, tempPath } = localVideoPath(response.id);
  if (!(await exists(filePath))) {
    await downloadFile(sourceUrl, filePath, tempPath);
  }

  return {
    ...response,
    content: {
      ...response.content,
      remote_video_url: response.content?.remote_video_url || sourceUrl,
      local_video_url: publicUrl,
      video_url: publicUrl
    }
  };
}
