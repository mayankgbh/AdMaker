import { SILENT_WAV } from "./mock";

const TTS = "https://api.elevenlabs.io/v1/text-to-speech";
const MUSIC = "https://api.elevenlabs.io/v1/music";

async function bytesToDataUrl(buf: ArrayBuffer, mime: string) {
  const b64 = Buffer.from(buf).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export async function tts(opts: {
  text: string;
  voiceId: string;
  modelId?: string;
  key?: string;
}): Promise<{ dataUrl: string; mock?: boolean }> {
  if (!opts.text.trim()) return { dataUrl: SILENT_WAV, mock: true };
  if (!opts.key) return { dataUrl: SILENT_WAV, mock: true };
  const model = opts.modelId || "eleven_multilingual_v2";
  // Calmer, more natural read than the expressive defaults: high stability,
  // no style exaggeration. This is what kills the "annoying" over-acting.
  const voice_settings =
    model === "eleven_v3"
      ? { stability: 0.5, similarity_boost: 0.75 }
      : { stability: 0.6, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true };
  const res = await fetch(`${TTS}/${opts.voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": opts.key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: opts.text, model_id: model, voice_settings }),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);
  return { dataUrl: await bytesToDataUrl(await res.arrayBuffer(), "audio/mpeg") };
}

// ElevenLabs Music length must be within 3000..600000 ms.
export function clampMusicMs(ms: number): number {
  return Math.max(3000, Math.min(600_000, Math.round(ms)));
}

export async function music(opts: {
  prompt: string;
  lengthMs: number;
  key?: string;
}): Promise<{ dataUrl: string; mock?: boolean }> {
  if (!opts.key) return { dataUrl: SILENT_WAV, mock: true };
  const music_length_ms = clampMusicMs(opts.lengthMs);
  const res = await fetch(`${MUSIC}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": opts.key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      prompt: opts.prompt,
      music_length_ms,
      model_id: "music_v2",
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs Music ${res.status}: ${await res.text()}`);
  return { dataUrl: await bytesToDataUrl(await res.arrayBuffer(), "audio/mpeg") };
}

// Curated, stable public ElevenLabs voices so users don't hunt IDs.
export const VOICE_PRESETS = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — warm British narrator" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — calm, authoritative" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — clean female" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — soft, modern female" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam — deep male" },
  { id: "ErXwobaYiN019PkySvjV", label: "Antoni — versatile male" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh — young male" },
  { id: "AZnzlk1XvdvUeBnXmlld", label: "Domi — confident female" },
];

// Natural by default; expressive available for more dramatic reads.
export const VOICE_MODELS = [
  { id: "eleven_multilingual_v2", label: "Natural (v2)" },
  { id: "eleven_v3", label: "Expressive (v3)" },
];
