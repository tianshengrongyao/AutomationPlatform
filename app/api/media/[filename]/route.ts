/**
 * GET /api/media/[filename]
 *
 * 动态服务运行时上传的文件
 * 为什么需要这个？
 * - Next.js 生产模式下，public/ 中的文件只在构建时可用
 * - 运行时上传的文件无法通过静态路径直接访问
 * - 这个路由从磁盘读取文件并返回，外部 API 可通过公网访问
 */

import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

/** MIME 类型映射（常见媒体格式） */
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // 安全过滤：只允许合法文件名字符
  if (!/^[a-zA-Z0-9一-鿿_.-]+$/.test(filename)) {
    return NextResponse.json({ error: "文件名不合法。" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);

  // 防止路径穿越攻击
  if (!filePath.startsWith(uploadDir)) {
    return NextResponse.json({ error: "禁止访问。" }, { status: 403 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
    }

    // 按文件大小限制缓存时间（大文件缓存更久）
    const maxAge = fileStat.size > 50 * 1024 * 1024 ? 86400 : 3600;

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    // 流式返回文件
    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileStat.size),
        "Cache-Control": `public, max-age=${maxAge}`,
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
