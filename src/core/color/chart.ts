// Chart palettes: series that stay apart for colour-blind viewers and reach
// 3:1 against the page (WCAG 1.4.11), derived from the brand colour.

import {
  differenceEuclidean,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  filterDeficiencyTrit,
} from "culori/fn";
import { fixLightness } from "../contrast/solve";
import { WCAG } from "../contrast/wcag";
import { type Oklch, oklch, toOklch } from "./convert";
import { type Gamut, mapToGamut } from "./gamut";
import { brandScale } from "./scale";

export type ChartMode = "light" | "dark";

export type ChartOptions = {
  mode: ChartMode;
  /** The page the chart sits on; every series must reach 3:1 against it. */
  background: Oklch;
  /** Number of series (default 5). */
  count?: number;
  /** One hue, stepped through the brand scale. Right for sequential data. */
  monochrome?: boolean;
  gamut?: Gamut;
};

export type ChartPalette = {
  readonly colors: readonly Oklch[];
  /** Smallest ΔE_OK between any two series, across all vision simulations. */
  readonly minDistance: number;
  /** True when `minDistance` reaches {@link MIN_CHART_DISTANCE}. */
  readonly distinct: boolean;
};

/** Pairs closer than this (ΔE_OK) are hard to tell apart. */
export const MIN_CHART_DISTANCE = 0.08;

/** Hue offsets from the brand: tuned, not uniform. */
const HUE_OFFSETS = [0, 150, 60, 210, 285, 330, 105, 30] as const;
/** Alternating lightness, so series also separate in greyscale. */
const LIGHTNESS = {
  light: [0.6, 0.75, 0.48, 0.82, 0.66],
  dark: [0.7, 0.58, 0.8, 0.64, 0.75],
} as const;
const MONOCHROME_STEPS = [300, 400, 500, 600, 700] as const;

const deltaE = differenceEuclidean("oklab");
const visions: ((color: Oklch) => Oklch)[] = [
  (color) => color,
  (color) => toOklch(filterDeficiencyProt(1)(color)),
  (color) => toOklch(filterDeficiencyDeuter(1)(color)),
  (color) => toOklch(filterDeficiencyTrit(1)(color)),
];

/** The closest pair across all simulations: its distance and later index. */
function closestPair(colors: readonly Oklch[]) {
  let min = Number.POSITIVE_INFINITY;
  let index = -1;
  for (const see of visions) {
    const seen = colors.map(see);
    for (let i = 0; i < seen.length; i++) {
      for (let j = i + 1; j < seen.length; j++) {
        const a = seen[i];
        const b = seen[j];
        if (!a || !b) continue;
        const d = deltaE(a, b);
        if (d < min) {
          min = d;
          index = j;
        }
      }
    }
  }
  return { distance: min, index };
}

// Enough nudges to walk a colour a full turn of hue; far more than needed.
const MAX_NUDGES = 36;
const HUE_NUDGE = 20;
const LIGHTNESS_NUDGE = 0.06;

export function chartPalette(
  brand: Oklch,
  {
    mode,
    background,
    count = 5,
    monochrome = false,
    gamut = "rgb",
  }: ChartOptions,
): ChartPalette {
  const reachable = (color: Oklch) =>
    fixLightness(color, background, WCAG.ui, gamut) ?? color;

  // Every series aims for the same chroma; the gamut may trim some of them.
  const chroma = Math.min(0.2, Math.max(0.12, brand.c));

  let colors: Oklch[];
  if (monochrome) {
    const scale = brandScale(brand, { gamut });
    colors = Array.from({ length: count }, (_, i) =>
      reachable(scale[MONOCHROME_STEPS[i % MONOCHROME_STEPS.length] ?? 500]),
    );
  } else {
    const ls = LIGHTNESS[mode];
    colors = Array.from({ length: count }, (_, i) =>
      reachable(
        mapToGamut(
          oklch(
            ls[i % ls.length] ?? 0.6,
            chroma,
            brand.h + (HUE_OFFSETS[i % HUE_OFFSETS.length] ?? 0),
          ),
          gamut,
        ),
      ),
    );
  }

  // Monochrome ramps are meant to differ by lightness only; leave them be.
  if (!monochrome) {
    // Lightness moves away from the page, so contrast only improves.
    const away = mode === "light" ? -LIGHTNESS_NUDGE : LIGHTNESS_NUDGE;
    for (let nudge = 0; nudge < MAX_NUDGES; nudge++) {
      const { distance, index } = closestPair(colors);
      if (distance >= MIN_CHART_DISTANCE || index < 0) break;
      const color = colors[index];
      if (!color) break;
      // Start from the target chroma, not the current one: a hue with little
      // room in the gamut must not leave the colour washed out for good.
      const moved =
        nudge % 2 === 0
          ? oklch(color.l, chroma, color.h + HUE_NUDGE)
          : oklch(
              Math.min(0.9, Math.max(0.25, color.l + away)),
              chroma,
              color.h,
            );
      colors[index] = reachable(mapToGamut(moved, gamut));
    }
  }

  const { distance } = closestPair(colors);
  return {
    colors,
    minDistance: distance,
    distinct: distance >= MIN_CHART_DISTANCE,
  };
}
