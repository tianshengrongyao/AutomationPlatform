/**
 * /api/upload
 *
 * POST → 上传媒体文件到服务器，返回可公开访问的 URL
 *
 * 为什么需要这个？
 * - 用户本地有素材文件，不想先传图床再贴 URL
 * - 上传后文件保存到 public/uploads/，外部 Seedance API 可通过服务器公网地址访问
 *
 * 安全限制：需要登录态、校验 MIME 类型、限制文件大小
 */

import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { jsonError, requireSession } from "@/lib/http";

/** 根据 MIME 类型判断媒体类别 */
function getMediaType(mimeType: string): "image_url" | "video_url" | "audio_url" {
  if (mimeType.startsWith("image/")) return "image_url";
  if (mimeType.startsWith("video/")) return "video_url";
  if (mimeType.startsWith("audio/")) return "audio_url";
  throw new Error(`不支持的文件类型: ${mimeType}`);
}

/** 安全文件名：只保留字母数字-_，去掉路径和特殊字符 */
function safeBaseName(original: string) {
  return original
    .replace(/\.[^.]+$/, "")      // 去掉扩展名
    .replace(/[^a-zA-Z0-9一-鿿_-]/g, "_")  // 保留中英文数字_-，其余替换为下划线
    .slice(0, 64);               // 截断，防止太长
}

/** 生成 UUID（crypto.randomUUID 可能在旧 Node 不可用，做 polyfill） */
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback: 简易 UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function POST(request: Request) {
  // 需要登录
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return jsonError("请选择要上传的文件。", 400);
    }

    // 校验 MIME 类型
    const mediaType = getMediaType(file.type);
    if (!mediaType) {
      return jsonError("不支持的文件类型，请上传图片、视频或音频文件。", 400);
    }

    // 校验文件大小（图片 20MB、视频 200MB、音频 50MB）
    const sizeLimits: Record<string, number> = {
      image_url: 20 * 1024 * 1024,
      video_url: 200 * 1024 * 1024,
      audio_url: 50 * 1024 * 1024
    };
    const maxSize = sizeLimits[mediaType];
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / 1024 / 1024);
      return jsonError(`文件过大，${mediaType === "image_url" ? "图片" : mediaType === "video_url" ? "视频" : "音频"}不能超过 ${sizeMB}MB。`, 413);
    }
    if (file.size === 0) {
      return jsonError("文件为空，请重新选择。", 400);
    }

    // 目标目录
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // 生成唯一文件名：UUID_安全原名.扩展名
    const ext = path.extname(file.name) || ".bin";
    const safeName = safeBaseName(file.name);
    const fileName = `${generateUUID()}_${safeName}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // 读取文件内容并写入磁盘
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // 返回公开访问 URL
    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      url: publicUrl,
      type: mediaType,
      name: file.name,
      size: file.size
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonError(`文件上传失败: ${message}`, 500);
  }
}
