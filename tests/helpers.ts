import type { Scene, Storyboard, ModelChoice, VideoModelId, ImageModelId } from "../lib/types";

export function scene(p: Partial<Scene> & { id: string; index: number }): Scene {
  return {
    durationSec: 4,
    visualType: "designed_card",
    voiceover: "",
    onScreenText: "",
    usesCharacterRef: false,
    status: "idle",
    ...p,
  };
}

export function board(p: Partial<Storyboard> = {}): Storyboard {
  return {
    title: "Test",
    logline: "logline",
    aspectRatio: "16:9",
    characterRef: null,
    musicPrompt: "cinematic build",
    scenes: [scene({ id: "s1", index: 0, voiceover: "hello there" })],
    ...p,
  };
}

export function choice(p: Partial<ModelChoice> = {}): ModelChoice {
  return {
    style: "stock",
    videoModel: "fal-ai/kling-video/v3/standard/text-to-video" as VideoModelId,
    imageModel: "fal-ai/flux/dev" as ImageModelId,
    voiceId: "x",
    voiceModel: "eleven_multilingual_v2",
    music: true,
    ...p,
  };
}
