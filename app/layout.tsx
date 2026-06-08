/**
 * 根布局组件
 * 定义 HTML 框架、浏览器标题、以及防主题闪烁的内联脚本
 *
 * 为什么有内联 script？
 * 如果等 React 加载完再设置主题，用户会看到一瞬间的白色闪烁（FOUC）
 * 这个 script 在页面渲染前就执行，保证主题立即生效
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "天生荣耀 - AI 视频生成",
  description: "团队内网视频生成创作工作台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('seedance-theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
