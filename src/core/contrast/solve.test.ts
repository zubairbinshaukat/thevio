import { describe, expect, it } from "vitest";
import { oklch } from "../color/convert";
import { inGamut } from "../color/gamut";
import {
  FIX_MARGIN,
  fixAlpha,
  fixForeground,
  fixLightness,
  pickOnColor,
} from "./solve";
import { contrastRatio } from "./wcag";

const WHITE = oklch(1, 0, 0);
const PAGE_DARK = oklch(0.145, 0, 0);

describe("fixLightness", () => {
  it("returns the colour itself when it already passes", () => {
    const fg = oklch(0.2, 0, 0);
    expect(fixLightness(fg, WHITE, 4.5)).toBe(fg);
  });

  it("makes the smallest move: lands just past the target", () => {
    const fixed = fixLightness(oklch(0.65, 0.12, 250), WHITE, 4.5);
    if (!fixed) throw new Error("expected a fix");
    const ratio = contrastRatio(fixed, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(4.5 + FIX_MARGIN);
    expect(ratio).toBeLessThan(4.5 + FIX_MARGIN + 0.01);
  });

  it("keeps hue and stays on the same side of the background", () => {
    const fixed = fixLightness(oklch(0.65, 0.12, 250), WHITE, 4.5);
    expect(fixed?.h).toBe(250);
    expect(fixed?.l).toBeLessThan(0.65);
    const light = fixLightness(oklch(0.5, 0.1, 30), PAGE_DARK, 4.5);
    expect(light?.l).toBeGreaterThan(0.5);
  });

  it("crosses over when its own side can't get there", () => {
    // On a dark-grey page even black only reaches ~1.5:1, so dark text has
    // to become light text.
    const page = oklch(0.3, 0, 0);
    const fixed = fixLightness(oklch(0.2, 0, 0), page, 4.5);
    if (!fixed) throw new Error("expected a fix");
    expect(fixed.l).toBeGreaterThan(page.l);
    expect(contrastRatio(fixed, page)).toBeGreaterThanOrEqual(4.5);
  });

  it("returns null when no lightness can pass", () => {
    expect(fixLightness(oklch(0.5, 0, 0), oklch(0.6, 0, 0), 21)).toBeNull();
  });

  it("always passes and stays in gamut, across the space", () => {
    for (const fl of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      for (const bl of [0.05, 0.3, 0.6, 0.97]) {
        for (const h of [0, 90, 145, 265]) {
          const fg = oklch(fl, 0.2, h);
          const bg = oklch(bl, 0.03, h + 40);
          for (const min of [3, 4.5, 7]) {
            const fixed = fixLightness(fg, bg, min);
            if (!fixed) continue;
            expect(contrastRatio(fixed, bg)).toBeGreaterThanOrEqual(min);
            // A colour that already passes comes back as given.
            if (fixed !== fg) expect(inGamut(fixed)).toBe(true);
          }
        }
      }
    }
  });
});

describe("fixAlpha", () => {
  it("raises opacity and keeps the colour", () => {
    const overlay = oklch(1, 0, 0, 0.15);
    const fixed = fixAlpha(overlay, PAGE_DARK, 3);
    if (!fixed) throw new Error("expected a fix");
    expect(fixed.l).toBe(1);
    expect(fixed.alpha).toBeGreaterThan(0.15);
    expect(contrastRatio(fixed, PAGE_DARK)).toBeGreaterThanOrEqual(3);
  });

  it("returns null when even fully opaque fails", () => {
    expect(fixAlpha(oklch(0.2, 0, 0, 0.5), PAGE_DARK, 3)).toBeNull();
  });
});

describe("fixForeground", () => {
  it("prefers opacity for overlays and falls back to lightness", () => {
    const viaAlpha = fixForeground(oklch(1, 0, 0, 0.1), PAGE_DARK, 3);
    expect(viaAlpha?.l).toBe(1);
    const viaLightness = fixForeground(oklch(0.25, 0, 0, 0.5), PAGE_DARK, 3);
    expect(viaLightness?.alpha).toBeUndefined();
    expect(
      contrastRatio(viaLightness ?? PAGE_DARK, PAGE_DARK),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("pickOnColor", () => {
  it("puts light text on dark fills and dark text on light fills", () => {
    expect(pickOnColor(oklch(0.3, 0.15, 265)).l).toBeGreaterThan(0.9);
    expect(pickOnColor(oklch(0.9, 0.1, 95)).l).toBeLessThan(0.3);
  });

  it("tints with the fill's hue, and never tints a grey", () => {
    const onBlue = pickOnColor(oklch(0.3, 0.15, 265));
    expect(onBlue.h).toBe(265);
    expect(onBlue.c).toBeGreaterThan(0);
    expect(pickOnColor(oklch(0.2, 0, 0)).c).toBe(0);
  });

  it("passes whenever black or white could", () => {
    for (let l = 0; l <= 1; l += 0.05) {
      const fill = oklch(l, 0.12, 30);
      const best = Math.max(
        contrastRatio(oklch(1, 0, 0), fill),
        contrastRatio(oklch(0, 0, 0), fill),
      );
      if (best >= 4.5) {
        expect(contrastRatio(pickOnColor(fill), fill)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });
});
