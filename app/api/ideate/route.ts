import type { NextRequest } from "next/server";
import { ideate } from "@/lib/providers/anthropic";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const keys = resolveKeys(req);
    const reply = await ideate(messages ?? [], keys.anthropic);
    return Response.json({ reply, mock: !keys.anthropic });
  } catch (e: any) {
    return jsonError(e?.message ?? "ideate failed");
  }
}
