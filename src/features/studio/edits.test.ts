import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { resolveTheme } from "@/core/theme/resolve";
import { normalizeColor, type Theme } from "@/core/theme/schema";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
import { contrastReport } from "./contrast";
import {
  applyStylePreset,
  clearPins,
  fixAllContrast,
  normalizeTheme,
  pinCount,
  sameTheme,
  setBrand,
  setComponent,
  setFont,
  setNeutral,
} from "./edits";

const pinned: Theme = {
  ...DEFAULT_THEME,
  overrides: {
    light: { primary: [0.4, 0.2, 260], background: [0.99, 0, 0] },
    dark: { ring: [0.6, 0.1, 260] },
  },
};

describe("edits", () => {
  it("setBrand drops the pins derived from the brand, and keeps the rest", () => {
    const next = setBrand(pinned, normalizeColor(0.6, 0.15, 30));
    expect(next.colors.brand).toEqual([0.6, 0.15, 30]);
    expect(next.overrides).toEqual({
      light: { background: [0.99, 0, 0] },
    });
  });

  it("setNeutral drops the pins derived from the neutrals", () => {
    const next = setNeutral(pinned, { chroma: 0.02 });
    expect(next.colors.neutral).toEqual({ hue: 0, chroma: 0.02 });
    expect(next.overrides).toEqual({ light: { primary: [0.4, 0.2, 260] } });
  });

  it("counts and clears pins", () => {
    expect(pinCount(pinned)).toBe(3);
    expect(pinCount(clearPins(pinned))).toBe(0);
  });

  it("applies a style preset and single tokens", () => {
    const soft = applyStylePreset(DEFAULT_THEME, "soft");
    expect(soft.components).toEqual(STYLE_PRESETS.soft);
    expect(setComponent(soft, "density", "compact").components.density).toBe(
      "compact",
    );
  });

  it("sets fonts; a null heading means same as body", () => {
    const withHeading = setFont(DEFAULT_THEME, "heading", "Fraunces");
    expect(withHeading.fonts.heading).toBe("Fraunces");
    expect(setFont(withHeading, "heading", null).fonts).not.toHaveProperty(
      "heading",
    );
    // Body and code can't be emptied.
    expect(setFont(DEFAULT_THEME, "sans", null).fonts.sans).toBe("Inter");
  });

  it("normalizeTheme clamps nothing silently: invalid themes are rejected", () => {
    expect(normalizeTheme({ ...DEFAULT_THEME, radius: 9 })).toBeNull();
    expect(normalizeTheme({ ...DEFAULT_THEME, name: "  Grove  " })?.name).toBe(
      "Grove",
    );
  });

  it("sameTheme compares by value", () => {
    expect(sameTheme(DEFAULT_THEME, structuredClone(DEFAULT_THEME))).toBe(true);
    expect(sameTheme(DEFAULT_THEME, { ...DEFAULT_THEME, radius: 1 })).toBe(
      false,
    );
  });

  it("fixAllContrast makes a failing brand pass, and is a no-op otherwise", () => {
    const pale = setBrand(DEFAULT_THEME, normalizeColor(0.95, 0.05, 100));
    expect(contrastReport(resolveTheme(pale)).failing.length).toBeGreaterThan(
      0,
    );

    const { theme, fixed } = fixAllContrast(pale);
    expect(fixed).toBeGreaterThan(0);
    expect(contrastReport(resolveTheme(theme)).failing).toEqual([]);

    // shadcn's own defaults fail a few pairs (e.g. muted text at 4.34:1).
    expect(fixAllContrast(DEFAULT_THEME).fixed).toBeGreaterThan(0);
    expect(fixAllContrast(theme)).toEqual({
      theme,
      fixed: 0,
    });
  });
});
