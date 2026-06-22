import type { NextRequest } from "next/server";
import { recordSignup, recordAd, normalizeSignup, normalizeAdEvent, storeReady } from "@/lib/store";
import { jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.type === "signup") {
      const s = normalizeSignup(body);
      if (s) await recordSignup(s);
    } else if (body?.type === "ad") {
      await recordAd(normalizeAdEvent(body));
    }
    return Response.json({ ok: true, stored: storeReady() });
  } catch (e: any) {
    return jsonError(e?.message ?? "track failed");
  }
}
