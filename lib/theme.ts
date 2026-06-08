/**
 * 明暗主题管理
 * 支持 localStorage 记住用户选择，以及跟随系统偏好
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "seedance-theme";

/** 读取已保存的主题，没有则跟随系统偏好 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";  // SSR 阶段默认暗色
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** 保存主题选择到 localStorage */
export function saveTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

/** 将主题应用到页面上（设置 data-theme 属性，CSS 变量自动切换） */
export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
