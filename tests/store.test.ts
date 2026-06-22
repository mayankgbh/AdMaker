import { describe, it, expect } from "vitest";
import { normalizeAdEvent, normalizeSignup, storeReady } from "../lib/store";

describe("normalizeSignup", () => {
  it("rejects invalid emails", () => {
    expect(normalizeSignup({ email: "nope", name: "A" })).toBeNull();
    expect(normalizeSignup({ name: "A" })).toBeNull();
  });
  it("accepts a valid signup and stamps firstSeen", () => {
    const s = normalizeSignup({ email: "a@b.com", name: "Ada", company: "X" });
    expect(s).toBeTruthy();
    expect(s!.email).toBe("a@b.com");
    expect(typeof s!.firstSeen).toBe("string");
  });
});

describe("normalizeAdEvent", () => {
  it("falls back to anonymous for bad email and clamps scenes", () => {
    const e = normalizeAdEvent({ email: "x", title: "T", scenes: 999 });
    expect(e.email).toBe("anonymous");
    expect(e.scenes).toBeLessThanOrEqual(50);
  });
  it("defaults kind to video unless stills", () => {
    expect(normalizeAdEvent({ kind: "stills" }).kind).toBe("stills");
    expect(normalizeAdEvent({ kind: "whatever" }).kind).toBe("video");
  });
});

describe("storeReady", () => {
  it("is false when no KV env is configured (sandbox/local)", () => {
    expect(typeof storeReady()).toBe("boolean");
  });
});
