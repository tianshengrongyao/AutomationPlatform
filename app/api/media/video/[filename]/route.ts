/**
 * GET /api/media/video/[filename]
 *
 * 动态服务下载到本地的生成视频
 * 视频由 local-video.ts 从远程 API 下载后保存在 data/videos/
 * 通过本路由对外提供访问，绕过 Next.js static file serving 的限制
 */

import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // 安全过滤
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    return NextResponse.json({ error: "文件名不合法。" }, { status: 400 });
  }

  const videoDir = path.join(process.cwd(), "data", "videos");
  const filePath = path.join(videoDir, filename);

  // 防止路径穿越
  if (!filePath.startsWith(videoDir)) {
    return NextResponse.json({ error: "禁止访问。" }, { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeType = ext === ".mp4" ? "video/mp4"
      : ext === ".webm" ? "video/webm"
      : ext === ".mov" ? "video/quicktime"
      : "application/octet-stream";

    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileStat.size),
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
    }
    return NextResponse.json({ error: "读取文件失败。" }, { status: 500 });
  }
}
