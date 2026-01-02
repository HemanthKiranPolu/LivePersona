import { NextResponse } from "next/server";

import { buildConnectionDetails } from "@/lib/livekit";

type Payload = {
  room?: string;
  identity?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: Payload;
  try {
    payload = (await req.json()) ?? {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { room, identity } = payload;
  if (!room || !identity) {
    return NextResponse.json(
      { error: "room and identity are required" },
      { status: 400 }
    );
  }

  try {
    const details = await buildConnectionDetails({ room, identity });
    return NextResponse.json(details);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build connection details";
    console.error("connection-details error:", error);
    const status = /Missing required env var/i.test(message) ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
