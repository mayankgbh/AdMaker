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

const CREATIVE_SYSTEM = `You are the creative director at a sharp, irreverent ad agency, paired with a founder or marketer who has no time. Your bias is to PRODUCE, not interrogate.

Rules:
- If the user names a company or gives a URL, USE WEB SEARCH to learn what it does before replying. Never tell the user to look it up themselves, and never say you can't browse — you can.
- Make confident assumptions about audience, tone, and angle. Ask AT MOST one question, and only if you genuinely cannot proceed. Default to deciding for them.
- Move fast. In your first substantive reply, give the angle in a line or two AND a full draft script. Do not spread it across five turns of questions.
- The moment the user signals go (a length, "do it", "whatever you think", "sure"), output the FINAL script immediately as scene-by-scene shot directions with VO. That is what they will lock.
- Tight prose. No corporate filler, no hedging, no em dashes.`;

const SCRIPT_SYSTEM = `Write the FINAL ad script as clean, scene-by-scene shot directions with voiceover. Pull product, audience, angle, and length from the conversation. If something essential is missing, make a smart assumption instead of asking. If a company or URL was mentioned and you lack detail, use web search to fill it in.

Output ONLY the script. Format: a title line, then numbered scenes, each with a one-line visual direction and a "VO:" line. No preamble, no questions, no sign-off.`;

const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 4 };

function extractText(data: any): string {
  return (data.content ?? [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

export async function ideate(
  messages: ChatMessage[],
  key?: string,
  mode: "chat" | "script" = "chat"
): Promise<string> {
  if (!key) {
    return mockIdeate(messages);
  }
  const res = await fetch(API, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: mode === "script" ? SCRIPT_SYSTEM : CREATIVE_SYSTEM,
      tools: [WEB_SEARCH_TOOL],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return extractText(await res.json());
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
  return `Mock mode — I can't think or look anything up without an Anthropic key.

Open Settings, paste your Anthropic key, and I'll research your company, find the angle, and write the full script in one pass. Until then this is just a dry run of the interface.`;
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
