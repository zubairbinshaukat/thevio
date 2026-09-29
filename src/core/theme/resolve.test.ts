import { describe, expect, it } from "vitest";
import { formatOklch } from "../color/convert";
import {
  SHADCN_NEUTRAL_DARK,
  SHADCN_NEUTRAL_LIGHT,
} from "../contrast/shadcn-neutral.fixture";
import { DEFAULT_THEME } from "./defaults";
import { resolveTheme } from "./resolve";
import { type Theme, ThemeSchemaV1 } from "./schema";
import { STYLE_PRESETS } from "./style-presets";
import type { ColorToken } from "./tokens";

const theme = (input: object): Theme => ThemeSchemaV1.parse({ v: 1, ...input });

// Tokens that come from the neutral scale, not from brand, danger or charts.
const NEUTRAL_TOKENS: ColorToken[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

describe("resolveTheme", () => {
  const resolved = resolveTheme(DEFAULT_THEME);

  it("with the default neutral, reproduces shadcn's neutral theme", () => {
    for (const token of NEUTRAL_TOKENS) {
      expect([token, formatOklch(resolved.colors.light[token])]).toEqual([
        token,
        formatOklch(SHADCN_NEUTRAL_LIGHT[token]),
      ]);
      expect([token, formatOklch(resolved.colors.dark[token])]).toEqual([
        token,
        formatOklch(SHADCN_NEUTRAL_DARK[token]),
      ]);
    }
  });

  it("uses the brand, untouched, as the light primary", () => {
    expect(formatOklch(resolved.colors.light.primary)).toBe(
      "oklch(0.5461 0.2152 262.88)",
    );
    expect(resolved.colors.light["sidebar-primary"]).toEqual(
      resolved.colors.light.primary,
    );
  });

  it("applies pinned colours last", () => {
    const pinned = resolveTheme(
      theme({ overrides: { dark: { primary: "#ff0000" } } }),
    );
    expect(pinned.colors.dark.primary.h).toBeCloseTo(29.23, 1);
    expect(pinned.colors.light.primary).toEqual(resolved.colors.light.primary);
  });

  it("tints the fills with a secondary colour", () => {
    const tinted = resolveTheme(theme({ colors: { secondary: "#f97316" } }));
    expect(tinted.colors.light.secondary.c).toBeGreaterThan(0);
    expect(tinted.colors.light.secondary.h).toBeCloseTo(47.6, 0);
    expect(tinted.scales.secondary).not.toBeNull();
  });

  it("can take the focus ring from the brand", () => {
    const ring = resolveTheme(theme({ states: { focusRing: "brand" } })).colors;
    expect(ring.light.ring).toEqual(ring.light.primary);
    expect(ring.dark.ring).toEqual(ring.dark.primary);
  });

  it("builds the radius scale from shadcn's multipliers", () => {
    expect(resolved.radius).toEqual({
      base: 0.625,
      sm: 0.375,
      md: 0.5,
      lg: 0.625,
      xl: 0.875,
      "2xl": 1.125,
      "3xl": 1.375,
      "4xl": 1.625,
    });
  });

  it("composes the shadow scale from one base shadow", () => {
    expect(resolved.shadows).toMatchSnapshot();
  });

  it("gives each style preset its own attributes and variables", () => {
    const attrs = (name: keyof typeof STYLE_PRESETS) =>
      resolveTheme(theme({ components: STYLE_PRESETS[name] })).components
        .attributes;
    const soft = attrs("soft");
    const crisp = attrs("crisp");
    const shadcn = attrs("shadcn");
    for (const key of Object.keys(soft)) {
      expect(new Set([soft[key], crisp[key], shadcn[key]]).size).toBe(3);
    }
    const vars = resolveTheme(theme({ components: STYLE_PRESETS.soft }))
      .components.vars;
    expect(vars["--tv-btn-radius"]).toBe("9999px");
    expect(vars["--tv-control-h"]).toBe("2.5rem");
  });

  it("is deterministic", () => {
    expect(resolveTheme(DEFAULT_THEME)).toEqual(resolveTheme(DEFAULT_THEME));
  });
});
