import type { NextRequest } from "next/server";
import { planStoryboard } from "@/lib/providers/anthropic";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { script, aspectRatio } = await req.json();
    const keys = resolveKeys(req);
    const board = await planStoryboard(script ?? "", aspectRatio ?? "16:9", keys.anthropic);
    return Response.json({ board, mock: !keys.anthropic });
  } catch (e: any) {
    return jsonError(e?.message ?? "plan failed");
  }
}
