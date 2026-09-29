import { describe, expect, it } from "vitest";
import { oklch, parseColor } from "../color/convert";
import { contrastRatio } from "./wcag";

const hex = (value: string) => {
  const color = parseColor(value);
  if (!color) throw new Error(value);
  return color;
};

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio(hex("#000"), hex("#fff"))).toBeCloseTo(21, 6);
    expect(contrastRatio(hex("#fff"), hex("#fff"))).toBeCloseTo(1, 6);
    // #767676 is the classic lightest grey that passes 4.5:1 on white.
    expect(contrastRatio(hex("#767676"), hex("#fff"))).toBeCloseTo(4.54, 2);
  });

  it("is symmetric for opaque colours", () => {
    const a = oklch(0.4, 0.1, 30);
    const b = oklch(0.9, 0.02, 200);
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it("composites a translucent colour over its background first", () => {
    const bg = oklch(0.145, 0, 0);
    const overlay = oklch(1, 0, 0, 0.15);
    const ratio = contrastRatio(overlay, bg);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(contrastRatio(oklch(1, 0, 0), bg));
    // Fully transparent means you only see the background.
    expect(contrastRatio(oklch(1, 0, 0, 0), bg)).toBeCloseTo(1, 6);
  });

  it("measures out-of-gamut colours as they would be displayed", () => {
    const ratio = contrastRatio(oklch(0.7, 0.4, 145), oklch(1, 0, 0));
    expect(Number.isFinite(ratio)).toBe(true);
    expect(ratio).toBeGreaterThan(1);
  });
});
