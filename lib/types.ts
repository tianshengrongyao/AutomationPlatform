/**
 * 全局类型定义
 * 项目中用到的所有数据结构都在这里定义
 */

/** 任务状态枚举 */
export type TaskStatus =
  | "queued"      // 排队中
  | "running"     // 生成中
  | "cancelled"   // 已取消
  | "succeeded"   // 已完成
  | "failed"      // 失败
  | "expired"     // 已超时
  | "unknown";    // 未知状态

/** 单个媒体输入（图片/视频/音频的 URL） */
export type MediaInput = {
  type: "image_url" | "video_url" | "audio_url";
  url: string;
};

/** 本地上传的 Base64 图片（第一版未启用，预留） */
export type ImageDataInput = {
  type: "image_base64";
  dataUrl: string;
  name: string;
};

/** 视频生成参数配置 */
export type GenerationOptions = {
  ratio: string;              // 画面比例
  resolution: string;         // 分辨率
  duration: number;           // 时长（秒）
  generateAudio: boolean;     // 是否生成同步音频
  watermark: boolean;         // 是否添加水印
  returnLastFrame: boolean;   // 是否返回最后一帧
  seed?: number;              // 随机种子（-1 为随机）
  priority: number;           // 优先级 0-9
  negativePrompt?: string;    // 负向提示词（排除不希望出现的元素）
  guideScale?: number;        // 引导系数 1-10，越大越贴近 prompt
  style?: string;             // 画面风格
  cameraMotion?: string;      // 运镜方式
};

/** 创建视频任务时的完整请求体 */
export type CreateGenerationRequest = {
  prompt: string;
  media: MediaInput[];
  uploadedImages: ImageDataInput[];
  options: GenerationOptions;
};

/** 上游 API 返回的任务响应 */
export type ArkTaskResponse = {
  id: string;
  model?: string;
  status?: TaskStatus;
  error?: unknown;
  content?: {
    video_url?: string;         // 视频地址（可能是本地或远程）
    local_video_url?: string;   // 本地缓存地址
    remote_video_url?: string;  // 远程原始地址（有有效期）
    last_frame_url?: string;    // 最后一帧截图
    file_url?: string;          // 文件地址
  };
  usage?: {
    completion_tokens?: number;
    total_tokens?: number;
  };
  created_at?: number;
  updated_at?: number;
  seed?: number;
  resolution?: string;
  ratio?: string;
  duration?: number;
  frames?: number;
  framespersecond?: number;
  generate_audio?: boolean;
  service_tier?: string;
  execution_expires_after?: number;
  draft?: boolean;
  priority?: number;
  progress?: string;            // 进度，如 "80%"
};

/** 本地存储的任务记录（存入 SQLite） */
export type StoredTask = {
  id: string;
  prompt: string;
  model: string;
  status: TaskStatus;
  createdAt: string;           // 任务创建时间
  updatedAt: string;           // 最后更新时间
  request: CreateGenerationRequest;  // 原始请求参数
  response?: ArkTaskResponse;  // 最新 API 响应
  error?: string;              // 错误信息（如果有）
};

/** 可选模型信息 */
export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  badge?: string;              // 标签，如「推荐」
};

/** 运镜预设 */
export type CameraPreset = {
  id: string;
  name: string;         // 中文名
  label: string;        // 英文标签
  promptPrefix: string; // 拼接到 prompt 前面的提示词
};

/** 画面风格预设 */
export type StylePreset = {
  id: string;
  name: string;
  promptPrefix: string;
};
