/**
 * 首页入口（服务端组件）
 * 职责：检查登录状态 → 传给客户端组件决定显示登录页还是工作台
 */

import { hasSession } from "@/lib/session";
import Workspace from "./workspace";

export default async function Home() {
  const authenticated = await hasSession();
  return <Workspace initialAuthenticated={authenticated} />;
}
