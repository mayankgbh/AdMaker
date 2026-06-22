import { describe, it, expect } from "vitest";
import { localSplit } from "../lib/providers/anthropic";

describe("localSplit", () => {
  it("always returns at least one scene", () => {
    const sb = localSplit("Just one line of script.", "16:9");
    expect(sb.scenes.length).toBeGreaterThan(0);
  });

  it("splits a multi-scene script into multiple scenes", () => {
    const script = `SCENE 1\nVO: First beat.\nSCENE 2\nVO: Second beat.\nSCENE 3\nVO: Third beat.`;
    const sb = localSplit(script, "16:9");
    expect(sb.scenes.length).toBeGreaterThanOrEqual(3);
  });

  it("strips VO: prefixes from the voiceover", () => {
    const sb = localSplit("VO: Hello world.", "16:9");
    expect((sb.scenes[0].voiceover || "").startsWith("VO")).toBe(false);
  });

  it("carries the requested aspect ratio through", () => {
    expect(localSplit("x", "9:16").aspectRatio).toBe("9:16");
  });
});
