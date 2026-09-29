import { describe, expect, it } from "vitest";
import { contrastRatio } from "../contrast/wcag";
import { oklch } from "./convert";
import { DARK_NEUTRAL_L, darkAccent, darkNeutral, whiteOverlay } from "./dark";

const lightBg = oklch(1, 0, 0);
const darkBg = oklch(DARK_NEUTRAL_L.background, 0, 0);

describe("darkAccent", () => {
  it("reproduces shadcn's hand-picked dark destructive", () => {
    // shadcn: light oklch(0.577 0.245 27.325) → dark oklch(0.704 0.191 22.216)
    const dark = darkAccent(oklch(0.577, 0.245, 27.325), {
      lightBg,
      darkBg,
      min: 4.5,
    });
    expect(dark.l).toBeCloseTo(0.704, 1);
    expect(Math.abs(dark.c - 0.191)).toBeLessThan(0.02);
    expect(dark.h).toBeCloseTo(27.325, 6);
  });

  it("keeps a colour that already works on both pages", () => {
    const teal = oklch(0.6, 0.1, 190);
    expect(contrastRatio(teal, lightBg)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(teal, darkBg)).toBeGreaterThanOrEqual(3);
    expect(darkAccent(teal, { lightBg, darkBg, min: 3 })).toBe(teal);
  });

  it("lifts a dark brand to a lighter step for dark mode", () => {
    const navy = oklch(0.3, 0.12, 265);
    const dark = darkAccent(navy, { lightBg, darkBg, min: 3 });
    expect(dark.l).toBeGreaterThan(navy.l);
    expect(dark.h).toBe(265);
  });
});

describe("dark neutrals", () => {
  it("keep the tint's hue but cap its chroma", () => {
    const surface = darkNeutral(0.205, { hue: 257, chroma: 0.046 });
    expect(surface).toEqual(oklch(0.205, 0.02, 257));
    expect(darkNeutral(0.145, { hue: 0, chroma: 0 }).c).toBe(0);
  });

  it("make borders from white overlays", () => {
    expect(whiteOverlay(0.1)).toEqual(oklch(1, 0, 0, 0.1));
  });
});
