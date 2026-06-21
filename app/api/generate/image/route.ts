import type { NextRequest } from "next/server";
import { generateImage } from "@/lib/providers/fal";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keys = resolveKeys(req);
    const out = await generateImage({ ...body, key: keys.fal });
    return Response.json(out);
  } catch (e: any) {
    return jsonError(e?.message ?? "image generation failed");
  }
}
