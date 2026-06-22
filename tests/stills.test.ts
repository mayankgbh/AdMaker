import { describe, it, expect } from "vitest";
import { STILL_SIZES } from "../lib/stills";

describe("STILL_SIZES", () => {
  it("covers the key paid-social placements", () => {
    const blob = STILL_SIZES.map((s) => s.platform.toLowerCase()).join(" ");
    for (const p of ["meta", "linkedin", "reddit", "stories"]) {
      expect(blob).toContain(p);
    }
  });
  it("has sane positive dimensions and a square format", () => {
    for (const s of STILL_SIZES) {
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
    }
    expect(STILL_SIZES.some((s) => s.w === s.h)).toBe(true);
  });
});
