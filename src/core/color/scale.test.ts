import { describe, expect, it } from "vitest";
import { formatOklch, oklch, parseColor } from "./convert";
import { inGamut } from "./gamut";
import {
  brandScale,
  nearestStep,
  neutralScale,
  type Scale,
  STEPS,
} from "./scale";

const lightness = (scale: Scale) => STEPS.map((step) => scale[step].l);
const print = (scale: Scale) =>
  Object.fromEntries(STEPS.map((step) => [step, formatOklch(scale[step])]));

// A grid of bases across the whole space, including extremes.
const BASES = [0.2, 0.35, 0.5, 0.62, 0.75, 0.9, 0.97].flatMap((l) =>
  [0, 0.05, 0.15, 0.3].flatMap((c) =>
    [0, 40, 100, 145, 200, 265, 320].map((h) => oklch(l, c, h)),
  ),
);

describe("brandScale", () => {
  it("puts the base on its nearest step, untouched", () => {
    const blue = parseColor("#3b82f6");
    if (!blue) throw new Error("fixture");
    const scale = brandScale(blue);
    expect(scale[nearestStep(blue)]).toBe(blue);
  });

  it("always runs light to dark", () => {
    for (const base of BASES) {
      const ls = lightness(brandScale(base));
      for (let i = 1; i < ls.length; i++) {
        expect(ls[i]).toBeLessThan(ls[i - 1] ?? 1);
      }
    }
  });

  it("keeps every generated step inside the gamut", () => {
    for (const base of BASES) {
      for (const gamut of ["rgb", "p3"] as const) {
        const scale = brandScale(base, { gamut });
        const anchor = nearestStep(base);
        for (const step of STEPS) {
          if (step !== anchor) expect(inGamut(scale[step], gamut)).toBe(true);
        }
      }
    }
  });

  it("keeps the base hue unless drift is asked for", () => {
    const base = oklch(0.6, 0.15, 250);
    for (const step of STEPS) expect(brandScale(base)[step].h).toBe(250);
    const drifted = brandScale(base, { hueShift: 10 });
    expect(drifted[950].h).toBeGreaterThan(250);
    expect(drifted[50].h).toBeLessThan(250);
  });

  it("peaks in chroma around the middle", () => {
    const scale = brandScale(oklch(0.6, 0.15, 250));
    expect(scale[600].c).toBeGreaterThan(scale[50].c);
    expect(scale[600].c).toBeGreaterThan(scale[950].c);
  });

  it("returns the same object for the same input", () => {
    const base = oklch(0.55, 0.2, 30);
    expect(brandScale(base)).toBe(brandScale(oklch(0.55, 0.2, 30)));
  });

  it("matches the golden scales", () => {
    const seeds = { blue: "#3b82f6", orange: "#f97316", green: "#16a34a" };
    const out = Object.fromEntries(
      Object.entries(seeds).map(([name, hex]) => {
        const base = parseColor(hex);
        if (!base) throw new Error(hex);
        return [name, print(brandScale(base))];
      }),
    );
    expect(out).toMatchSnapshot();
  });
});

describe("neutralScale", () => {
  it("with no tint, is exactly Tailwind's (and shadcn's) neutral", () => {
    expect(lightness(neutralScale({ hue: 0, chroma: 0 }))).toEqual([
      0.985, 0.97, 0.922, 0.87, 0.708, 0.556, 0.439, 0.371, 0.269, 0.205, 0.145,
    ]);
    for (const step of STEPS) {
      expect(neutralScale({ hue: 0, chroma: 0 })[step].c).toBe(0);
    }
  });

  it("tints lightly at the light end and fully in the middle", () => {
    const slate = neutralScale({ hue: 257, chroma: 0.046 });
    expect(slate[500].c).toBeCloseTo(0.046, 6);
    expect(slate[50].c).toBeLessThan(0.01);
    expect(slate[500].h).toBe(257);
  });
});
