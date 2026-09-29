// M1's budget: a full colour recompute (every scale, both modes, charts,
// every contrast pair checked and fixed) must fit well inside a frame.

import { describe, expect, it } from "vitest";
import { chartPalette } from "./color/chart";
import { type Oklch, oklch } from "./color/convert";
import {
  DARK_NEUTRAL_L,
  darkAccent,
  darkNeutral,
  whiteOverlay,
} from "./color/dark";
import { brandScale, neutralScale } from "./color/scale";
import { fixContrast } from "./contrast/fix";
import { pickOnColor } from "./contrast/solve";
import type { ColorTokens } from "./theme/tokens";

const BUDGET_MS = 5;

// A rough stand-in for M2's resolver: same amount of work, simpler mapping.
function recompute(hue: number) {
  const brand = oklch(0.58, 0.19, hue);
  const tint = { hue, chroma: 0.012 };
  const n = neutralScale(tint);
  const destructive = oklch(0.577, 0.245, 27.325);
  brandScale(brand);
  brandScale(destructive);

  const lightBg = oklch(1, 0, 0);
  const darkBg = darkNeutral(DARK_NEUTRAL_L.background, tint);
  const lightCharts = chartPalette(brand, {
    mode: "light",
    background: lightBg,
  }).colors;
  const darkCharts = chartPalette(brand, {
    mode: "dark",
    background: darkBg,
  }).colors;

  const tokens = (
    page: Oklch,
    surface: Oklch,
    subtle: Oklch,
    text: Oklch,
    mutedText: Oklch,
    primary: Oklch,
    danger: Oklch,
    line: Oklch,
    field: Oklch,
    ring: Oklch,
    charts: readonly Oklch[],
  ): ColorTokens => {
    const chart = (i: number) => charts[i] ?? primary;
    return {
      background: page,
      foreground: text,
      card: surface,
      "card-foreground": text,
      popover: surface,
      "popover-foreground": text,
      primary,
      "primary-foreground": pickOnColor(primary),
      secondary: subtle,
      "secondary-foreground": text,
      muted: subtle,
      "muted-foreground": mutedText,
      accent: subtle,
      "accent-foreground": text,
      destructive: danger,
      "destructive-foreground": pickOnColor(danger),
      border: line,
      input: field,
      ring,
      "chart-1": chart(0),
      "chart-2": chart(1),
      "chart-3": chart(2),
      "chart-4": chart(3),
      "chart-5": chart(4),
      sidebar: surface,
      "sidebar-foreground": text,
      "sidebar-primary": primary,
      "sidebar-primary-foreground": pickOnColor(primary),
      "sidebar-accent": subtle,
      "sidebar-accent-foreground": text,
      "sidebar-border": line,
      "sidebar-ring": ring,
    };
  };

  const light = tokens(
    lightBg,
    lightBg,
    n[100],
    n[950],
    n[500],
    brand,
    destructive,
    n[200],
    n[200],
    n[400],
    lightCharts,
  );
  const dark = tokens(
    darkBg,
    darkNeutral(DARK_NEUTRAL_L.surface, tint),
    darkNeutral(DARK_NEUTRAL_L.subtle, tint),
    darkNeutral(DARK_NEUTRAL_L.foreground, tint),
    darkNeutral(DARK_NEUTRAL_L.mutedForeground, tint),
    darkAccent(brand, { lightBg, darkBg, min: 3 }),
    darkAccent(destructive, { lightBg, darkBg, min: 4.5 }),
    whiteOverlay(0.1),
    whiteOverlay(0.15),
    darkNeutral(DARK_NEUTRAL_L.ring, tint),
    darkCharts,
  );
  return [fixContrast(light), fixContrast(dark)];
}

describe("engine performance", () => {
  it(`recomputes a whole theme in under ${BUDGET_MS} ms`, () => {
    for (let i = 0; i < 10; i++) recompute(i * 7);

    // A new hue every run, like dragging the brand slider: no cache hits.
    const times: number[] = [];
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      recompute(100 + i * 4.3);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)] ?? 0;
    expect(median).toBeLessThan(BUDGET_MS);
  });
});
