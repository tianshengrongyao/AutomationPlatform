"use client";

import { useCallback, useState } from "react";
import type { StoredTask } from "@/lib/types";
import AppShell from "./components/app-shell";
import LoginPage from "./components/login-page";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detailText =
      typeof data.details === "string"
        ? data.details
        : data.details
          ? JSON.stringify(data.details)
          : "";
    throw new Error(
      detailText ? `${data.error || "请求失败。"} ${detailText}` : data.error || "请求失败。"
    );
  }
  return data as T;
}

export default function Workspace({ initialAuthenticated }: { initialAuthenticated: boolean }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [tasks, setTasks] = useState<StoredTask[]>([]);

  const handleLogin = useCallback(async (password: string) => {
    await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setTasks([]);
  }, []);

  if (!authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <AppShell onLogout={handleLogout} tasks={tasks} setTasks={setTasks} />;
}
