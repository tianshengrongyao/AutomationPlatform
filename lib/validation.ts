/**
 * 请求参数校验
 * 使用 Zod 库定义所有输入规则，不合规的请求会被拦截
 */

import { z } from "zod";

/**
 * 素材 URL 校验
 * 支持两种形式：
 * 1. 公网 http/https URL
 * 2. 本地上传路径 /uploads/...
 */
const publicUrl = z
  .string()
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^\/uploads\//i.test(value),
    "请输入有效的公网 URL，或上传本地文件。"
  );

/** 创建视频任务的请求校验规则 */
export const createGenerationSchema = z.object({
  // 创作描述：1-8000 字符
  prompt: z.string().trim().min(1, "请输入视频创意或脚本。").max(8000, "创作描述不能超过 8000 字符。"),

  // 媒体素材列表（图片/视频/音频 URL）
  media: z
    .array(
      z.object({
        type: z.enum(["image_url", "video_url", "audio_url"]),
        url: publicUrl
      })
    )
    .default([]),

  // Base64 图片上传（第一版未启用，最多 4 张，单张不超过约 7MB）
  uploadedImages: z
    .array(
      z.object({
        type: z.literal("image_base64"),
        dataUrl: z
          .string()
          .startsWith("data:image/", "只支持图片文件。")
          .max(10 * 1024 * 1024, "单张图片不能超过约 7MB。"),
        name: z.string().min(1).max(120)
      })
    )
    .max(4, "第一版最多上传 4 张图片。")
    .default([]),

  // 生成参数
  options: z.object({
    ratio: z.enum(["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]),
    resolution: z.enum(["480p", "720p", "1080p"]),
    duration: z.number().int().min(-1).max(15),
    generateAudio: z.boolean(),
    watermark: z.boolean(),
    returnLastFrame: z.boolean(),
    seed: z.number().int().min(-1).max(4294967295).optional(),
    priority: z.number().int().min(0).max(9),
    negativePrompt: z.string().max(2000).optional(),
    guideScale: z.number().min(1).max(10).optional(),
    style: z.string().max(100).optional(),
    cameraMotion: z.string().max(100).optional()
  })
});
