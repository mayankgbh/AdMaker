import type { NextRequest } from "next/server";
import { tts } from "@/lib/providers/elevenlabs";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, modelId } = await req.json();
    const keys = resolveKeys(req);
    const out = await tts({ text, voiceId, modelId, key: keys.elevenlabs });
    return Response.json(out);
  } catch (e: any) {
    return jsonError(e?.message ?? "voice generation failed");
  }
}
