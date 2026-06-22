"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { Storyboard } from "./types";
import { FPS, sceneFrameCount, drawSceneFrame, ensureFonts, type Theme } from "./motion";

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
  style: "stock" | "designed" | "ai_video";
  sceneMedia: Record<string, { url: string; mock?: boolean } | undefined>;
  voUrls: Record<string, string | undefined>;
  durations: Record<string, number | undefined>; // VO-driven effective duration per scene
  musicUrl?: string;
  theme?: Theme;
  brandName?: string;
  website?: string;
  onProgress?: (msg: string) => void;
}

const SIZE: Record<string, [number, number]> = {
  "16:9": [1280, 720],
  "9:16": [720, 1280],
  "1:1": [1024, 1024],
};

function pngFromCanvas(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((res) =>
    canvas.toBlob(async (b) => res(new Uint8Array(await b!.arrayBuffer())), "image/png")
  );
}

export async function assemble(input: AssembleInput): Promise<string> {
  const { board, style, sceneMedia, voUrls, durations, musicUrl, theme, brandName, website, onProgress } = input;
  const log = onProgress ?? (() => {});
  await ensureFonts();
  const ffmpeg = await getFFmpeg(log);
  const [w, h] = SIZE[board.aspectRatio] || SIZE["16:9"];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Effective duration per scene — driven by the voiceover so picture locks to voice.
  const dur = (id: string, fallback: number) =>
    Math.max(2, Math.min(12, durations[id] ?? fallback));

  const segFiles: string[] = [];

  for (let i = 0; i < board.scenes.length; i++) {
    const scene = board.scenes[i];
    const d = dur(scene.id, scene.durationSec);
    const seg = `seg${i}.mp4`;
    const media = sceneMedia[scene.id];
    const frames = Math.max(1, Math.round(d * FPS));

    const isLast = i === board.scenes.length - 1;
    const hasFootage = style === "stock" && media?.url && !media.mock;
    const hasClip = style === "ai_video" && media?.url && !media.mock;
    const overlay = hasFootage || (hasClip && isLast); // last AI scene gets the end-card overlay

    let footageOK = false;
    if (hasFootage || hasClip) {
      try {
        await ffmpeg.writeFile(`clip${i}`, await fetchFile(media!.url));
        footageOK = true;
      } catch (e) {
        log(`scene ${i + 1}: footage fetch blocked, using designed motion`);
      }
    }

    if (footageOK && hasClip && !isLast) {
      // AI video clip, no text overlay
      await ffmpeg.exec([
        "-stream_loop", "-1", "-i", `clip${i}`,
        "-t", String(d),
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=${FPS}`,
        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), seg,
      ]);
    } else if (footageOK && overlay) {
      // Footage/clip background + kinetic text overlay (transparent frames)
      log(`scene ${i + 1}: footage + text`);
      for (let f = 0; f < frames; f++) {
        drawSceneFrame(ctx, scene, f, frames, w, h, { index: i, count: board.scenes.length, isLast, overFootage: true, theme, brandName, website });
        await ffmpeg.writeFile(`t${i}_${String(f).padStart(4, "0")}.png`, await pngFromCanvas(canvas));
      }
      await ffmpeg.exec([
        "-stream_loop", "-1", "-i", `clip${i}`,
        "-framerate", String(FPS), "-i", `t${i}_%04d.png`,
        "-filter_complex",
        `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,fps=${FPS}[bg];[bg][1:v]overlay=shortest=0[v]`,
        "-map", "[v]", "-t", String(d), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), seg,
      ]);
      for (let f = 0; f < frames; f++) {
        try { await ffmpeg.deleteFile(`t${i}_${String(f).padStart(4, "0")}.png`); } catch {}
      }
    } else {
      // Designed motion (full art-directed background)
      log(`scene ${i + 1}: designed motion`);
      for (let f = 0; f < frames; f++) {
        drawSceneFrame(ctx, scene, f, frames, w, h, { index: i, count: board.scenes.length, isLast, theme, brandName, website });
        await ffmpeg.writeFile(`f${i}_${String(f).padStart(4, "0")}.png`, await pngFromCanvas(canvas));
      }
      await ffmpeg.exec([
        "-framerate", String(FPS), "-i", `f${i}_%04d.png`,
        "-t", String(d), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(FPS), seg,
      ]);
      for (let f = 0; f < frames; f++) {
        try { await ffmpeg.deleteFile(`f${i}_${String(f).padStart(4, "0")}.png`); } catch {}
      }
    }
    if (footageOK) { try { await ffmpeg.deleteFile(`clip${i}`); } catch {} }
    segFiles.push(seg);
  }

  await ffmpeg.writeFile("concat.txt", segFiles.map((f) => `file '${f}'`).join("\n"));
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "video.mp4"]);
  log("stitched");

  // VO: each scene's audio is exactly its effective duration (VO padded with silence),
  // so the concatenated audio aligns 1:1 with the concatenated video.
  const voList: string[] = [];
  for (let i = 0; i < board.scenes.length; i++) {
    const scene = board.scenes[i];
    const d = dur(scene.id, scene.durationSec);
    const url = voUrls[scene.id];
    const name = `vo${i}.mp3`;
    if (url && !url.startsWith("data:audio/wav")) {
      await ffmpeg.writeFile(`raw${i}.mp3`, await fetchFile(url));
      await ffmpeg.exec(["-i", `raw${i}.mp3`, "-af", "apad", "-t", String(d), "-c:a", "libmp3lame", name]);
    } else {
      await ffmpeg.exec([
        "-f", "lavfi", "-t", String(d),
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:a", "libmp3lame", name,
      ]);
    }
    voList.push(name);
  }
  await ffmpeg.writeFile("vo.txt", voList.map((f) => `file '${f}'`).join("\n"));
  await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "vo.txt", "-c", "copy", "vo.mp3"]);

  if (musicUrl && !musicUrl.startsWith("data:audio/wav")) {
    await ffmpeg.writeFile("music.mp3", await fetchFile(musicUrl));
    await ffmpeg.exec([
      "-i", "video.mp4", "-i", "vo.mp3", "-i", "music.mp3",
      "-filter_complex", "[2:a]volume=0.32[m];[1:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]",
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", "final.mp4",
    ]);
  } else {
    await ffmpeg.exec([
      "-i", "video.mp4", "-i", "vo.mp3",
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", "final.mp4",
    ]);
  }
  log("mixed");

  const data = (await ffmpeg.readFile("final.mp4")) as Uint8Array;
  return URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" }));
}
