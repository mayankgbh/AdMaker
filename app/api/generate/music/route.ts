import type { NextRequest } from "next/server";
import { music } from "@/lib/providers/elevenlabs";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const { prompt, lengthMs } = await req.json();
    const keys = resolveKeys(req);
    const out = await music({ prompt, lengthMs, key: keys.elevenlabs });
    return Response.json(out);
  } catch (e: any) {
    return jsonError(e?.message ?? "music generation failed");
  }
}
