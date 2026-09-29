import { describe, expect, it } from "vitest";
import { decodeTheme } from "@/core/codec/decode";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import {
  DEFAULT_LINK_LENGTH,
  PAIR_COUNT,
  SHOWCASE,
  scopeStyles,
  THEME_IDS,
} from "./data";

describe("landing showcase data", () => {
  it("starts from the default theme and reports what auto-fix changed", () => {
    const shown = decodeTheme(SHOWCASE.default.share.t);
    expect({ ...shown, overrides: {} }).toEqual(DEFAULT_THEME);
    expect(SHOWCASE.default.brand.hex).toBe("#2563eb");
    expect(SHOWCASE.default.fixes.length).toBeGreaterThan(0);
    expect(SHOWCASE.default.passingBefore.light).toBeLessThan(PAIR_COUNT);
    expect(DEFAULT_LINK_LENGTH).toBe(14);
  });

  it.each(THEME_IDS)("%s passes every WCAG 2 pair in both modes", (id) => {
    for (const mode of ["light", "dark"] as const) {
      const { checked, passing } = SHOWCASE[id].contrast[mode];
      expect(checked).toBe(PAIR_COUNT);
      expect(passing).toBe(PAIR_COUNT);
    }
  });

  it.each(THEME_IDS)("%s round-trips through its share link", (id) => {
    const theme = decodeTheme(SHOWCASE[id].share.t);
    expect(theme?.name).toBe(
      id === "default" ? "Untitled" : SHOWCASE[id].label,
    );
  });

  it("marks exactly one base step on every coloured scale", () => {
    for (const id of THEME_IDS) {
      for (const scale of SHOWCASE[id].scales) {
        const bases = scale.swatches.filter((s) => s.base).length;
        expect(bases).toBe(scale.name === "Neutral" ? 0 : 1);
      }
    }
  });

  it("scopes both modes of every sample", () => {
    const styles = scopeStyles();
    for (const id of THEME_IDS) {
      expect(styles).toContain(`.tv-scope[data-theme="${id}"]{--background:`);
      expect(styles).toContain(
        `.tv-scope[data-theme="${id}"][data-mode="dark"]`,
      );
    }
  });
});
