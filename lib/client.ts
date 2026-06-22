"use client";
import type { ApiKeys } from "./types";

const KEY = "admaker.keys.v1";

export function loadKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveKeys(keys: ApiKeys) {
  localStorage.setItem(KEY, JSON.stringify(keys));
}

function keyHeaders(keys: ApiKeys): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json" };
  if (keys.anthropic) h["x-anthropic-key"] = keys.anthropic;
  if (keys.fal) h["x-fal-key"] = keys.fal;
  if (keys.elevenlabs) h["x-elevenlabs-key"] = keys.elevenlabs;
  if (keys.pexels) h["x-pexels-key"] = keys.pexels;
  return h;
}

export async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: keyHeaders(loadKeys()),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export function hasAnyKey(k: ApiKeys) {
  return !!(k.anthropic || k.fal || k.elevenlabs);
}

const IDENTITY_KEY = "admaker.identity.v1";

export interface Identity {
  name: string;
  email: string;
  company?: string;
}

export function loadIdentity(): Identity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(id: Identity) {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
}

// Fire-and-forget analytics; never throws into the UI.
export function track(payload: Record<string, unknown>) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
