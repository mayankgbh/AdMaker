import type { NextRequest } from "next/server";
import { stillCopy } from "@/lib/providers/anthropic";
import { resolveKeys, jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { brief } = await req.json();
    const keys = resolveKeys(req);
    const concepts = await stillCopy(brief ?? "", keys.anthropic);
    return Response.json({ concepts, mock: !keys.anthropic });
  } catch (e: any) {
    return jsonError(e?.message ?? "stills copy failed");
  }
}
