import { describe, it, expect } from "vitest";
import { estimateCost, fmtUsd, VIDEO_MODELS } from "../lib/pricing";
import { board, scene, choice } from "./helpers";

describe("estimateCost", () => {
  it("charges nothing for video in stock mode", () => {
    const c = estimateCost(board(), choice({ style: "stock" }));
    const visuals = c.lines.find((l) => l.label.toLowerCase().includes("stock"));
    expect(visuals?.usd).toBe(0);
  });

  it("charges nothing for video in designed mode", () => {
    const c = estimateCost(board(), choice({ style: "designed" }));
    const visuals = c.lines.find((l) => l.label.toLowerCase().includes("designed"));
    expect(visuals?.usd).toBe(0);
  });

  it("prices ai_video as seconds * model rate", () => {
    const model = "fal-ai/kling-video/v3/standard/text-to-video" as const;
    const b = board({
      scenes: [
        scene({ id: "s1", index: 0, visualType: "ai_video", durationSec: 5, voiceover: "" }),
        scene({ id: "s2", index: 1, visualType: "ai_video", durationSec: 3, voiceover: "" }),
      ],
    });
    const c = estimateCost(b, choice({ style: "ai_video", videoModel: model }));
    const v = c.lines.find((l) => l.label === "AI video");
    expect(v?.usd).toBeCloseTo(8 * VIDEO_MODELS[model].usdPerSec, 5);
  });

  it("includes voiceover cost proportional to characters", () => {
    const b = board({ scenes: [scene({ id: "s1", index: 0, voiceover: "x".repeat(1000) })] });
    const c = estimateCost(b, choice());
    const vo = c.lines.find((l) => l.label === "Voiceover");
    expect(vo).toBeTruthy();
    expect(vo!.usd).toBeGreaterThan(0);
  });

  it("Veo is priced at audio-off rate (0.20/s), not 0.40", () => {
    expect(VIDEO_MODELS["fal-ai/veo3.1"].usdPerSec).toBe(0.2);
  });

  it("total is the sum of line items, rounded", () => {
    const c = estimateCost(board(), choice());
    const sum = c.lines.reduce((n, l) => n + l.usd, 0);
    expect(c.totalUsd).toBeCloseTo(Math.round(sum * 100) / 100, 5);
  });
});

describe("fmtUsd", () => {
  it("formats to two decimals with a dollar sign", () => {
    expect(fmtUsd(1.5)).toBe("$1.50");
    expect(fmtUsd(0)).toBe("$0.00");
  });
});
