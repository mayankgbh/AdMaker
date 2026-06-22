import type { AspectRatio } from "../types";

const API = "https://api.pexels.com/videos/search";

function orientation(ar: AspectRatio) {
  if (ar === "9:16") return "portrait";
  if (ar === "1:1") return "square";
  return "landscape";
}

// Returns a direct mp4 URL for a clip matching the query, or null in mock mode.
export async function searchFootage(opts: {
  query: string;
  aspectRatio: AspectRatio;
  key?: string;
}): Promise<{ url: string | null; mock?: boolean }> {
  if (!opts.key) return { url: null, mock: true };
  const url = `${API}?query=${encodeURIComponent(opts.query)}&per_page=8&orientation=${orientation(opts.aspectRatio)}&size=medium`;
  const res = await fetch(url, { headers: { Authorization: opts.key } });
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const videos = data.videos ?? [];
  if (!videos.length) return { url: null };
  // Pick a mid-resolution mp4 (~1280 wide) to keep in-browser assembly light.
  for (const v of videos) {
    const files = (v.video_files ?? []).filter((f: any) => f.file_type === "video/mp4");
    files.sort((a: any, b: any) => Math.abs((a.width || 0) - 1280) - Math.abs((b.width || 0) - 1280));
    if (files[0]?.link) return { url: files[0].link };
  }
  return { url: null };
}
