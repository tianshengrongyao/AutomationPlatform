export type TaskStatus =
  | "queued"
  | "running"
  | "cancelled"
  | "succeeded"
  | "failed"
  | "expired"
  | "unknown";

export type MediaInput = {
  type: "image_url" | "video_url" | "audio_url";
  url: string;
};

export type ImageDataInput = {
  type: "image_base64";
  dataUrl: string;
  name: string;
};

export type GenerationOptions = {
  ratio: string;
  resolution: string;
  duration: number;
  generateAudio: boolean;
  watermark: boolean;
  returnLastFrame: boolean;
  seed?: number;
  priority: number;
  /** 负向提示词 */
  negativePrompt?: string;
  /** 引导系数 1-10 */
  guideScale?: number;
  /** 画面风格 */
  style?: string;
  /** 运镜方式 */
  cameraMotion?: string;
};

export type CreateGenerationRequest = {
  prompt: string;
  media: MediaInput[];
  uploadedImages: ImageDataInput[];
  options: GenerationOptions;
};

export type ArkTaskResponse = {
  id: string;
  model?: string;
  status?: TaskStatus;
  error?: unknown;
  content?: {
    video_url?: string;
    local_video_url?: string;
    remote_video_url?: string;
    last_frame_url?: string;
    file_url?: string;
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
  progress?: string;
};

export type StoredTask = {
  id: string;
  prompt: string;
  model: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  request: CreateGenerationRequest;
  response?: ArkTaskResponse;
  error?: string;
};

/** 模型信息 */
export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  badge?: string;
};

/** 运镜预设 */
export type CameraPreset = {
  id: string;
  name: string;
  label: string;
  promptPrefix: string;
};

/** 风格预设 */
export type StylePreset = {
  id: string;
  name: string;
  promptPrefix: string;
};
