import { hasSession } from "@/lib/session";
import Workspace from "./workspace";

export default async function Home() {
  const authenticated = await hasSession();
  return <Workspace initialAuthenticated={authenticated} />;
}
