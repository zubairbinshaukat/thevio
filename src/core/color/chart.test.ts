import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG } from "../contrast/wcag";
import { chartPalette, MIN_CHART_DISTANCE } from "./chart";
import { formatOklch, oklch, parseColor } from "./convert";
import { inGamut } from "./gamut";

const PAGES = {
  light: oklch(1, 0, 0),
  dark: oklch(0.145, 0, 0),
} as const;

const BRANDS = ["#3b82f6", "#f97316", "#16a34a", "#a855f7", "#e11d48"].map(
  (hex) => {
    const color = parseColor(hex);
    if (!color) throw new Error(hex);
    return color;
  },
);

describe("chartPalette", () => {
  for (const mode of ["light", "dark"] as const) {
    it(`reaches 3:1 and stays apart for colour-blind viewers (${mode})`, () => {
      for (const brand of BRANDS) {
        const palette = chartPalette(brand, {
          mode,
          background: PAGES[mode],
        });
        expect(palette.colors).toHaveLength(5);
        for (const color of palette.colors) {
          expect(contrastRatio(color, PAGES[mode])).toBeGreaterThanOrEqual(
            WCAG.ui,
          );
          expect(inGamut(color)).toBe(true);
        }
        expect(palette.distinct).toBe(true);
        expect(palette.minDistance).toBeGreaterThanOrEqual(MIN_CHART_DISTANCE);
      }
    });
  }

  it("starts from the brand hue", () => {
    const brand = oklch(0.6, 0.15, 250);
    const [first] = chartPalette(brand, {
      mode: "light",
      background: PAGES.light,
    }).colors;
    expect(first?.h).toBe(250);
  });

  it("builds a monochrome ramp from the brand scale", () => {
    const brand = oklch(0.6, 0.15, 250);
    const { colors } = chartPalette(brand, {
      mode: "light",
      background: PAGES.light,
      monochrome: true,
    });
    for (const color of colors) {
      expect(color.h).toBe(250);
      expect(contrastRatio(color, PAGES.light)).toBeGreaterThanOrEqual(3);
    }
  });

  it("matches the golden palettes", () => {
    const out = Object.fromEntries(
      (["light", "dark"] as const).map((mode) => [
        mode,
        chartPalette(BRANDS[0] ?? oklch(0.6, 0.15, 250), {
          mode,
          background: PAGES[mode],
        }).colors.map(formatOklch),
      ]),
    );
    expect(out).toMatchSnapshot();
  });
});
