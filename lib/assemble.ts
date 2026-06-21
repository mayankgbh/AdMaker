"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { Scene, Storyboard } from "./types";

let ff: FFmpeg | null = null;

async function getFFmpeg(onLog?: (s: string) => void) {
  if (ff) return ff;
  ff = new FFmpeg();
  if (onLog) ff.on("log", ({ message }) => onLog(message));
  const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ff;
}

export interface AssembleInput {
  board: Storyboard;
  // resolved media per scene: a playable video/image URL (or null for cards we render to color)
  sceneMedia: Record<string, { url: string; mock?: boolean } | undefined>;
  voUrls: Record<string, string | undefined>; // sceneId -> VO data url
  musicUrl?: string;
  onProgress?: (msg: string) => void;
}

const SIZE: Record<string, string> = {
  "16:9": "1280x720",
  "9:16": "720x1280",
  "1:1": "1024x1024",
};

// Build a still card as a PNG via canvas, returned as a Uint8Array.
async function renderCard(scene: Scene, w: number, h: number): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#15120e";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#E9E2D3";
  ctx.textAlign = "center";
  const head = scene.card?.headline || scene.onScreenText || "";
  ctx.font = `700 ${Math.round(w / 12)}px sans-serif`;
  ctx.fillText(head, w / 2, h / 2 - 10);
  if (scene.card?.sub) {
    ctx.fillStyle = "#FF5631";
    ctx.font = `500 ${Math.round(w / 28)}px sans-serif`;
    ctx.fillText(scene.card.sub, w / 2, h / 2 + Math.round(w / 16));
  }
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

// Mock scene: a colored slate so the export is visible without real video.
async function renderSlate(scene: Scene, w: number, h: number): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const hue = (scene.index * 47) % 360;
  ctx.fillStyle = `hsl(${hue} 30% 18%)`;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#9A8F7E";
  ctx.font = `600 ${Math.round(w / 36)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`SCENE ${scene.index + 1} · ${scene.visualType}`, w / 2, 50);
  ctx.fillStyle = "#E9E2D3";
  wrap(ctx, scene.videoPrompt || scene.voiceover || "(mock)", w / 2, h / 2, w * 0.8, 28);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  ctx.font = "400 22px sans-serif";
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = word + " ";
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

/**
 * Assemble the ad. Each scene becomes a normalized clip of its own duration,
 * clips are concatenated, then the full VO and music beds are mixed over the top.
 * Returns an MP4 blob URL.
 */
export async function assemble(input: AssembleInput): Promise<string> {
  const { board, sceneMedia, voUrls, musicUrl, onProgress } = input;
  const log = onProgress ?? (() => {});
  const ffmpeg = await getFFmpeg(log);
  const [w, h] = (SIZE[board.aspectRatio] || SIZE["16:9"]).split("x").map(Number);

  const segFiles: string[] = [];

  for (const scene of board.scenes) {
    const dur = Math.max(2, Math.min(8, scene.durationSec));
    const media = sceneMedia[scene.id];
    const out = `seg${scene.index}.mp4`;

    if (media?.url && !media.mock) {
      // Real video clip: normalize size/fps/codec and trim to scene duration.
      await ffmpeg.writeFile(`in${scene.index}`, await fetchFile(media.url));
      await ffmpeg.exec([
        "-i", `in${scene.index}`,
        "-t", String(dur),
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", out,
      ]);
    } else {
      // Card / mock / screen-rec placeholder: render a PNG and hold it for the duration.
      const png =
        scene.visualType === "designed_card"
          ? await renderCard(scene, w, h)
          : await renderSlate(scene, w, h);
      await ffmpeg.writeFile(`card${scene.index}.png`, png);
      await ffmpeg.exec([
        "-loop", "1", "-i", `card${scene.index}.png`,
        "-t", String(dur),
        "-vf", `scale=${w}:${h},setsar=1,fps=30`,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", out,
      ]);
    }
    segFiles.push(out);
    log(`scene ${scene.index + 1} ready`);
  }

  // Concat the video segments.
  await ffmpeg.writeFile("concat.txt", segFiles.map((f) => `file '${f}'`).join("\n"));
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "video.mp4"]);
  log("video stitched");

  // Build one continuous VO track by concatenating per-scene VO at scene offsets.
  // Simpler robust approach: concat VO clips in order (gaps where silent).
  const voList: string[] = [];
  for (const scene of board.scenes) {
    const url = voUrls[scene.id];
    const name = `vo${scene.index}.mp3`;
    if (url && !url.startsWith("data:audio/wav")) {
      await ffmpeg.writeFile(name, await fetchFile(url));
    } else {
      // silence sized to the scene
      await ffmpeg.exec([
        "-f", "lavfi", "-t", String(scene.durationSec),
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:a", "libmp3lame", name,
      ]);
    }
    voList.push(name);
  }
  await ffmpeg.writeFile("vo.txt", voList.map((f) => `file '${f}'`).join("\n"));
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "vo.txt", "-c", "copy", "vo.mp3"]);

  // Mix VO + music (music ducked under VO) and mux onto the video.
  if (musicUrl && !musicUrl.startsWith("data:audio/wav")) {
    await ffmpeg.writeFile("music.mp3", await fetchFile(musicUrl));
    await ffmpeg.exec([
      "-i", "video.mp4", "-i", "vo.mp3", "-i", "music.mp3",
      "-filter_complex",
      "[2:a]volume=0.35[m];[1:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]",
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", "final.mp4",
    ]);
  } else {
    await ffmpeg.exec([
      "-i", "video.mp4", "-i", "vo.mp3",
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", "final.mp4",
    ]);
  }
  log("audio mixed");

  const data = (await ffmpeg.readFile("final.mp4")) as Uint8Array;
  const blob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
  return URL.createObjectURL(blob);
}
