import type { NextRequest } from "next/server";
import { getSignups, getAds, storeReady } from "@/lib/store";
import { jsonError } from "@/lib/route-utils";

export const runtime = "nodejs";

const PASSWORD = process.env.ADMIN_PASSWORD || "Gather2026";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (password !== PASSWORD) return jsonError("wrong password", 401);
    const [signups, ads] = await Promise.all([getSignups(), getAds()]);
    return Response.json({ configured: storeReady(), signups, ads });
  } catch (e: any) {
    return jsonError(e?.message ?? "admin fetch failed");
  }
}
