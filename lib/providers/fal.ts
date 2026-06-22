import { createFalClient } from "@fal-ai/client";
import type { AspectRatio, VideoModelId, ImageModelId } from "../types";
import { mockVideo, mockImage } from "./mock";

// Different video models only accept specific clip lengths. Map our 2-8s scene
// duration onto each model's allowed values so fal doesn't reject the request.
function durationFor(model: VideoModelId, sec: number): string | number {
  const s = Math.max(2, Math.min(8, Math.round(sec)));
  if (model.includes("kling") || model.includes("seedance")) return s > 7 ? "10" : "5";
  return s; // veo accepts a numeric range
}

function imageSize(ar: AspectRatio) {
  if (ar === "9:16") return "portrait_16_9";
  if (ar === "1:1") return "square_hd";
  return "landscape_16_9";
}

function pickUrl(data: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = k.split(".").reduce((o: any, p) => o?.[p], data);
    if (typeof v === "string") return v;
  }
  return data?.images?.[0]?.url ?? data?.videos?.[0]?.url;
}

function friendlyError(e: any): string {
  // fal ValidationError carries a body with field-level detail — surface it.
  const detail = e?.body?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => `${(d.loc || []).join(".")}: ${d.msg}`).join("; ");
  }
  return e?.message || "fal request failed";
}

export async function generateVideo(opts: {
  model: VideoModelId;
  prompt: string;
  durationSec: number;
  aspectRatio: AspectRatio;
  imageUrl?: string;
  index: number;
  key?: string;
}): Promise<{ url: string; mock?: boolean; prompt?: string; index?: number }> {
  if (!opts.key) return mockVideo(opts.prompt, opts.index);
  const fal = createFalClient({ credentials: opts.key });

  const input: any = {
    prompt: opts.prompt,
    duration: durationFor(opts.model, opts.durationSec),
    aspect_ratio: opts.aspectRatio,
  };
  if (opts.imageUrl && opts.model.includes("image-to-video")) {
    input.image_url = opts.imageUrl;
  }

  try {
    const { data } = await fal.subscribe(opts.model, { input });
    const url = pickUrl(data, ["video.url", "url"]);
    if (!url) throw new Error("fal returned no video url");
    return { url };
  } catch (e: any) {
    throw new Error(friendlyError(e));
  }
}

export async function generateImage(opts: {
  model: ImageModelId;
  prompt: string;
  aspectRatio: AspectRatio;
  key?: string;
}): Promise<{ url: string; mock?: boolean; prompt?: string }> {
  if (!opts.key) return mockImage(opts.prompt);
  const fal = createFalClient({ credentials: opts.key });
  try {
    const { data } = await fal.subscribe(opts.model, {
      input: { prompt: opts.prompt, image_size: imageSize(opts.aspectRatio), num_images: 1 },
    });
    const url = pickUrl(data, ["images.0.url", "image.url"]);
    if (!url) throw new Error("fal returned no image url");
    return { url };
  } catch (e: any) {
    throw new Error(friendlyError(e));
  }
}
