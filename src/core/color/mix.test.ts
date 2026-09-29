import { describe, expect, it } from "vitest";
import { oklch } from "./convert";
import { mixOklch } from "./mix";

const close = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

describe("mixOklch", () => {
  it("interpolates lightness and chroma linearly", () => {
    const mixed = mixOklch(oklch(0.2, 0.1, 30), oklch(0.8, 0.3, 30), 0.25);
    close(mixed.l, 0.35);
    close(mixed.c, 0.15);
    close(mixed.h, 30);
  });

  it("takes the shorter hue arc across 0°", () => {
    close(mixOklch(oklch(0.5, 0.1, 350), oklch(0.5, 0.1, 10), 0.5).h, 0);
    close(mixOklch(oklch(0.5, 0.1, 10), oklch(0.5, 0.1, 350), 0.25).h, 5);
  });

  it("treats an achromatic colour's hue as missing", () => {
    // White mixed with a blue keeps the blue's hue, like CSS color-mix.
    const tint = mixOklch(oklch(1, 0, 0), oklch(0.55, 0.2, 263), 0.12);
    close(tint.h, 263);
    close(tint.l, 0.946);
    close(tint.c, 0.024);
  });

  it("clamps the amount and returns the ends", () => {
    const a = oklch(0.3, 0.1, 100);
    const b = oklch(0.9, 0.05, 200);
    expect(mixOklch(a, b, -1)).toEqual(a);
    close(mixOklch(a, b, 2).l, 0.9);
  });

  it("premultiplies by alpha", () => {
    const mixed = mixOklch(oklch(1, 0, 0, 0), oklch(0.5, 0.1, 40), 0.5);
    close(mixed.alpha ?? 1, 0.5);
    close(mixed.l, 0.5); // the transparent side contributes nothing
  });
});
