import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";

export async function GET() {
  return NextResponse.json({ authenticated: await hasSession() });
}
