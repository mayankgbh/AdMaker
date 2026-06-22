import { describe, it, expect } from "vitest";
import { clampMusicMs, VOICE_PRESETS, VOICE_MODELS } from "../lib/providers/elevenlabs";

describe("clampMusicMs", () => {
  it("never goes below the 3000ms floor", () => {
    expect(clampMusicMs(500)).toBe(3000);
  });
  it("never exceeds the 600000ms ceiling", () => {
    expect(clampMusicMs(9_999_999)).toBe(600_000);
  });
  it("passes valid lengths through (rounded)", () => {
    expect(clampMusicMs(30_000.4)).toBe(30_000);
  });
});

describe("voice options", () => {
  it("offers several voices with unique ids", () => {
    expect(VOICE_PRESETS.length).toBeGreaterThanOrEqual(5);
    const ids = VOICE_PRESETS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("defaults the model list to a natural option first", () => {
    expect(VOICE_MODELS[0].id).toBe("eleven_multilingual_v2");
  });
});
