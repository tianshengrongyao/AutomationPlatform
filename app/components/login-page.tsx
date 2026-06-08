"use client";

import { Loader2, Lock, Sparkles, Wand2 } from "lucide-react";
import { FormEvent, useState } from "react";

export default function LoginPage({ onLogin }: { onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">
          <Sparkles size={24} />
        </div>
        <h1>Seedance 视频生成</h1>
        <p>团队内网 AI 创作工作台。输入共享口令后开始生成视频。</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="password-row">
            <Lock size={18} color="var(--color-ink-tertiary)" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入团队口令"
            />
          </div>
          <button type="submit" disabled={loading || !password.trim()}>
            {loading ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
            进入工作台
          </button>
          {error ? (
            <p style={{ color: "var(--color-red)", fontSize: "var(--text-sm)", margin: 0 }}>{error}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
