import { Redis } from "@upstash/redis";

export interface Signup {
  name: string;
  email: string;
  company?: string;
  firstSeen: string;
}

export interface AdEvent {
  email: string;
  name?: string;
  title: string;
  brand?: string;
  style: string;
  scenes: number;
  kind: "video" | "stills";
  at: string;
}

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function storeReady(): boolean {
  return !!redis();
}

const isEmail = (s: unknown) => typeof s === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function normalizeAdEvent(input: any): AdEvent {
  return {
    email: isEmail(input?.email) ? input.email : "anonymous",
    name: input?.name ? String(input.name).slice(0, 120) : undefined,
    title: String(input?.title || "Untitled").slice(0, 200),
    brand: input?.brand ? String(input.brand).slice(0, 120) : undefined,
    style: String(input?.style || "stock"),
    scenes: Number.isFinite(+input?.scenes) ? Math.max(0, Math.min(50, Math.round(+input.scenes))) : 0,
    kind: input?.kind === "stills" ? "stills" : "video",
    at: new Date().toISOString(),
  };
}

export function normalizeSignup(input: any): Signup | null {
  if (!isEmail(input?.email)) return null;
  return {
    email: input.email,
    name: String(input?.name || "").slice(0, 120),
    company: input?.company ? String(input.company).slice(0, 160) : undefined,
    firstSeen: new Date().toISOString(),
  };
}

export async function recordSignup(s: Signup): Promise<void> {
  const r = redis();
  if (!r) return;
  const existing = await r.hget<Signup>("signups", s.email);
  if (!existing) await r.hset("signups", { [s.email]: s });
}

export async function recordAd(e: AdEvent): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.lpush("ads", e);
  await r.ltrim("ads", 0, 999);
}

export async function getSignups(): Promise<Signup[]> {
  const r = redis();
  if (!r) return [];
  const all = await r.hgetall<Record<string, Signup>>("signups");
  return all ? Object.values(all).sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1)) : [];
}

export async function getAds(): Promise<AdEvent[]> {
  const r = redis();
  if (!r) return [];
  return (await r.lrange<AdEvent>("ads", 0, 999)) || [];
}
