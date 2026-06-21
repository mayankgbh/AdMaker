import { SILENT_WAV } from "./mock";

const TTS = "https://api.elevenlabs.io/v1/text-to-speech";
const MUSIC = "https://api.elevenlabs.io/v1/music";

async function bytesToDataUrl(buf: ArrayBuffer, mime: string) {
  // Server-side base64 (Node Buffer available in route runtime).
  const b64 = Buffer.from(buf).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export async function tts(opts: {
  text: string;
  voiceId: string;
  key?: string;
}): Promise<{ dataUrl: string; mock?: boolean }> {
  if (!opts.text.trim()) return { dataUrl: SILENT_WAV, mock: true };
  if (!opts.key) return { dataUrl: SILENT_WAV, mock: true };
  const res = await fetch(`${TTS}/${opts.voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": opts.key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: opts.text,
      model_id: "eleven_v3",
      voice_settings: { stability: 0.45, similarity_boost: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  return { dataUrl: await bytesToDataUrl(await res.arrayBuffer(), "audio/mpeg") };
}

export async function music(opts: {
  prompt: string;
  lengthMs: number;
  key?: string;
}): Promise<{ dataUrl: string; mock?: boolean }> {
  if (!opts.key) return { dataUrl: SILENT_WAV, mock: true };
  const res = await fetch(MUSIC, {
    method: "POST",
    headers: { "xi-api-key": opts.key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      prompt: opts.prompt,
      music_length_ms: Math.max(10_000, Math.min(120_000, Math.round(opts.lengthMs))),
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs Music ${res.status}: ${await res.text()}`);
  return { dataUrl: await bytesToDataUrl(await res.arrayBuffer(), "audio/mpeg") };
}

// A few sensible default voices users can pick without hunting IDs.
export const VOICE_PRESETS = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "Documentary — warm male" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — clean female" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam — deep narrator" },
];
