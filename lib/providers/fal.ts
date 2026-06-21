import type { AspectRatio, VideoModelId, ImageModelId } from "../types";
import { mockVideo, mockImage } from "./mock";

const QUEUE = "https://queue.fal.run";

function auth(key: string) {
  return { Authorization: `Key ${key}`, "content-type": "application/json" };
}

function aspectToSize(ar: AspectRatio) {
  // fal models vary; most accept an aspect_ratio string.
  return ar;
}

async function submitAndWait(model: string, input: any, key: string, timeoutMs = 240_000) {
  const submit = await fetch(`${QUEUE}/${model}`, {
    method: "POST",
    headers: auth(key),
    body: JSON.stringify(input),
  });
  if (!submit.ok) throw new Error(`fal submit ${submit.status}: ${await submit.text()}`);
  const { request_id } = await submit.json();
  const base = `${QUEUE}/${model.split("/").slice(0, 2).join("/")}/requests/${request_id}`;

  const started = Date.now();
  // Poll status until completed.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - started > timeoutMs) throw new Error("fal timeout");
    await new Promise((r) => setTimeout(r, 2500));
    const st = await fetch(`${base}/status`, { headers: auth(key) });
    if (!st.ok) continue;
    const sj = await st.json();
    if (sj.status === "COMPLETED") break;
    if (sj.status === "FAILED") throw new Error("fal generation failed");
  }
  const result = await fetch(base, { headers: auth(key) });
  if (!result.ok) throw new Error(`fal result ${result.status}`);
  return result.json();
}

export async function generateVideo(opts: {
  model: VideoModelId;
  prompt: string;
  durationSec: number;
  aspectRatio: AspectRatio;
  imageUrl?: string; // reference still for image→video models
  index: number;
  key?: string;
}): Promise<{ url: string; mock?: boolean; prompt?: string; index?: number }> {
  if (!opts.key) return mockVideo(opts.prompt, opts.index);
  const input: any = {
    prompt: opts.prompt,
    duration: String(Math.max(2, Math.min(8, Math.round(opts.durationSec)))),
    aspect_ratio: aspectToSize(opts.aspectRatio),
  };
  if (opts.imageUrl && opts.model.includes("image-to-video")) {
    input.image_url = opts.imageUrl;
  }
  const out = await submitAndWait(opts.model, input, opts.key);
  const url = out?.video?.url ?? out?.videos?.[0]?.url ?? out?.url;
  if (!url) throw new Error("fal returned no video url");
  return { url };
}

export async function generateImage(opts: {
  model: ImageModelId;
  prompt: string;
  aspectRatio: AspectRatio;
  key?: string;
}): Promise<{ url: string; mock?: boolean; prompt?: string }> {
  if (!opts.key) return mockImage(opts.prompt);
  const out = await submitAndWait(
    opts.model,
    { prompt: opts.prompt, image_size: opts.aspectRatio === "9:16" ? "portrait_16_9" : "landscape_16_9" },
    opts.key
  );
  const url = out?.images?.[0]?.url ?? out?.image?.url;
  if (!url) throw new Error("fal returned no image url");
  return { url };
}
