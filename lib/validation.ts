import { z } from "zod";

const publicUrl = z
  .string()
  .url("请输入有效的公网 URL。")
  .refine((value) => /^https?:\/\//i.test(value), "URL 必须以 http:// 或 https:// 开头。");

export const createGenerationSchema = z.object({
  prompt: z.string().trim().min(1, "请输入视频创意或脚本。").max(8000, "创作描述不能超过 8000 字符。"),
  media: z
    .array(
      z.object({
        type: z.enum(["image_url", "video_url", "audio_url"]),
        url: publicUrl
      })
    )
    .default([]),
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
