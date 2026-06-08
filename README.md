# Seedance 视频生成内网站

团队内网 Seedance 视频生成工作台。前端提供创作输入、参考素材、参数控制和任务历史；后端代理视频生成 API，避免在浏览器暴露密钥。

## 配置

复制 `.env.example` 为 `.env.local`，然后填入真实配置：

```env
ARK_API_KEY=你的 API Key
ARK_MODEL_ID=seedance-2.0-vision-1080
SITE_PASSWORD=团队访问口令
SESSION_SECRET=一串足够长的随机字符串
```

如果使用火山方舟官方 API Key，可以不填 `ARK_BASE_URL`，默认使用：

```env
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_CREATE_TASK_PATH=/contents/generations/tasks
ARK_QUERY_TASK_PATH=/contents/generations/tasks/{id}
```

如果使用 `sk-` 开头的非官方/代理 Key，必须向提供方确认对应接口地址，并填写：

```env
ARK_BASE_URL=https://代理方提供的域名/路径前缀
ARK_CREATE_TASK_PATH=代理方提供的创建任务路径
ARK_QUERY_TASK_PATH=代理方提供的查询任务路径，任务 ID 用 {id} 占位
```

没有代理 Base URL 时，`sk-` Key 不能直接请求火山方舟官方地址。

## 运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`，输入 `SITE_PASSWORD` 后进入工作台。

## 使用说明

- Prompt 必填。
- 图片支持本地上传转 base64，也支持填写公网图片 URL。
- 视频和音频第一版使用公网 URL。
- 任务提交后会写入本地 `data/tasks.json`，页面右侧会自动轮询排队中和运行中的任务。
- 视频 URL 通常有有效期，请及时打开、下载或转存。

## 校验

```bash
npm run typecheck
npm run lint
npm run build
```
