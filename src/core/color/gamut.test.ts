import { describe, expect, it } from "vitest";
import { oklch } from "./convert";
import { inGamut, mapToGamut } from "./gamut";

describe("mapToGamut", () => {
  it("leaves in-gamut colours alone", () => {
    const color = oklch(0.6, 0.1, 250);
    expect(mapToGamut(color)).toBe(color);
  });

  it("only lowers chroma: lightness and hue stay exact", () => {
    const vivid = oklch(0.7, 0.4, 145);
    const mapped = mapToGamut(vivid);
    expect(inGamut(mapped)).toBe(true);
    expect(mapped.l).toBe(vivid.l);
    expect(mapped.h).toBe(vivid.h);
    expect(mapped.c).toBeLessThan(vivid.c);
    expect(mapped.c).toBeGreaterThan(0.1);
  });

  it("keeps more chroma in P3 than in sRGB", () => {
    const vivid = oklch(0.7, 0.4, 145);
    const p3 = mapToGamut(vivid, "p3");
    expect(inGamut(p3, "p3")).toBe(true);
    expect(p3.c).toBeGreaterThan(mapToGamut(vivid, "rgb").c);
  });

  it("clamps lightness into 0–1 and keeps alpha", () => {
    expect(mapToGamut(oklch(1.2, 0, 0)).l).toBe(1);
    expect(mapToGamut(oklch(0.7, 0.4, 145, 0.5)).alpha).toBe(0.5);
  });
});
