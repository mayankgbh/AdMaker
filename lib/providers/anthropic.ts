import type { AspectRatio, ChatMessage, Storyboard } from "../types";
import { mockStoryboard } from "./mock";

const API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function headers(key: string) {
  return {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  };
}

const CREATIVE_SYSTEM = `You are the creative director at a sharp, irreverent ad agency. The user is a founder or marketer with no video skills who wants a short ad (15-60s) that other marketers will actually stop and watch.

Be a real creative partner: push for one strong idea over five weak ones, find the human tension, write punchy. When they ask for a script, write it tight with clear visual direction. No corporate filler, no hedging, no em dashes. When the idea is good, say so and tell them to lock it. Keep replies conversational and short unless they ask for a full script.`;

export async function ideate(messages: ChatMessage[], key?: string): Promise<string> {
  if (!key) {
    return mockIdeate(messages);
  }
  const res = await fetch(API, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: CREATIVE_SYSTEM,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

const PLAN_SYSTEM = `You convert an approved ad script into a production storyboard as STRICT JSON. Rules that come from how real AI video models work in 2026 — follow them exactly:

- Models cannot make long clips. Every scene's durationSec must be between 2 and 8.
- Split the script into scenes that each carry ONE beat. A 45s ad is roughly 8-12 scenes.
- visualType is one of: "ai_video" (a generated moving shot), "designed_card" (any shot with readable words: persona slides, stats, invoices, logos, kinetic typography — models mangle text, so these are designed, never generated), "screen_rec" (a placeholder for the user's own screen recording, e.g. a product demo).
- For ai_video scenes write a vivid videoPrompt: subject, setting, lighting, camera, mood. End with the clip length.
- If a character or subject recurs across scenes, set usesCharacterRef:true on those scenes and fill characterRef with a description for a single reference still that will be reused. If nothing recurs, characterRef is null.
- voiceover is the narration line under each scene (empty string if none). onScreenText is any big words shown.
- musicPrompt describes one instrumental bed with an arc.

Return ONLY the JSON object, no prose, no code fences. Shape:
{"title":string,"logline":string,"aspectRatio":"16:9"|"9:16"|"1:1","characterRef":{"description":string}|null,"musicPrompt":string,"scenes":[{"durationSec":number,"visualType":"ai_video"|"designed_card"|"screen_rec","videoPrompt":string,"card":{"headline":string,"sub":string,"bullets":string[],"note":string},"voiceover":string,"onScreenText":string,"usesCharacterRef":boolean}]}`;

export async function planStoryboard(
  script: string,
  aspectRatio: AspectRatio,
  key?: string
): Promise<Storyboard> {
  if (!key) {
    return mockStoryboard(script, aspectRatio);
  }
  const res = await fetch(API, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: PLAN_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Aspect ratio: ${aspectRatio}\n\nScript:\n${script}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return normalizeBoard(raw, aspectRatio);
}

function mockIdeate(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1]?.content ?? "";
  return `[mock mode — paste an Anthropic key in Settings for the real creative director]

Here's a direction for: "${last.slice(0, 80)}"

Concept: make the villain the thing your audience secretly does. Open on it played straight, hold a beat too long, then turn. End on your product as the obvious way out.

Tell me your product and audience and I'll write the full script. When you like it, hit Lock script.`;
}

// Shared: turn raw model JSON (or mock) into a clean Storyboard with safe defaults.
export function normalizeBoard(raw: string, aspectRatio: AspectRatio): Storyboard {
  let obj: any;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
    obj = JSON.parse(cleaned);
  } catch {
    // Last resort: pull the first {...} block.
    const m = raw.match(/\{[\s\S]*\}/);
    obj = m ? JSON.parse(m[0]) : { scenes: [] };
  }
  const scenes = (obj.scenes ?? []).map((s: any, i: number) => ({
    id: `s${i + 1}`,
    index: i,
    durationSec: Math.max(2, Math.min(8, Math.round(s.durationSec ?? 5))),
    visualType: ["ai_video", "designed_card", "screen_rec"].includes(s.visualType)
      ? s.visualType
      : "ai_video",
    videoPrompt: s.videoPrompt ?? "",
    card: s.card,
    voiceover: s.voiceover ?? "",
    onScreenText: s.onScreenText ?? "",
    usesCharacterRef: !!s.usesCharacterRef,
    status: "idle" as const,
  }));
  return {
    title: obj.title ?? "Untitled ad",
    logline: obj.logline ?? "",
    aspectRatio: (obj.aspectRatio as AspectRatio) ?? aspectRatio,
    characterRef: obj.characterRef?.description
      ? { description: obj.characterRef.description }
      : null,
    musicPrompt: obj.musicPrompt ?? "",
    scenes,
  };
}
