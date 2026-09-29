// 50–950 shade scales from one colour.
//
// Lightness follows a template averaged from Tailwind v4, warped so the base
// colour lands exactly on its nearest step while 50 and 950 stay pinned.
// Chroma follows a hump that peaks around 600, scaled to the base's chroma.
// Every generated step is mapped into gamut; the base itself is never changed.

import { type Oklch, oklch } from "./convert";
import { type Gamut, mapToGamut } from "./gamut";

export const STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;
export type Step = (typeof STEPS)[number];
export type Scale = Readonly<Record<Step, Oklch>>;

/** Lightness template for chromatic colours (Tailwind v4 average). */
const BRAND_L = [
  0.975, 0.935, 0.885, 0.81, 0.71, 0.63, 0.555, 0.49, 0.43, 0.385, 0.275,
] as const;
/** Chroma relative to the peak: a hump that tops out at 600. */
const BRAND_C = [
  0.07, 0.15, 0.27, 0.47, 0.77, 0.95, 1, 0.93, 0.78, 0.62, 0.4,
] as const;

/** Tailwind v4 neutral lightness, which is also shadcn's neutral palette. */
const NEUTRAL_L = [
  0.985, 0.97, 0.922, 0.87, 0.708, 0.556, 0.439, 0.371, 0.269, 0.205, 0.145,
] as const;
/** Neutral chroma relative to the peak: light end nearly grey, dark end flat. */
const NEUTRAL_C = [
  0.07, 0.15, 0.28, 0.48, 0.87, 1, 1, 0.96, 0.89, 0.91, 0.91,
] as const;

export type ScaleOptions = {
  gamut?: Gamut;
  /** Total hue drift in degrees from 50 to 950, applied around the base. */
  hueShift?: number;
};

/** Index of the template step closest to `l`. */
function nearestIndex(template: readonly number[], l: number): number {
  let best = 0;
  for (let i = 1; i < template.length; i++) {
    if (
      Math.abs((template[i] ?? 0) - l) < Math.abs((template[best] ?? 0) - l)
    ) {
      best = i;
    }
  }
  return best;
}

/**
 * Remap the template so `template[anchor]` becomes `l`, keeping both ends
 * pinned. Piecewise linear on each side, so the curve stays monotonic.
 */
function warpLightness(
  template: readonly number[],
  anchor: number,
  l: number,
): number[] {
  const last = template.length - 1;
  const top = template[0] ?? 1;
  const bottom = template[last] ?? 0;
  const pivot = template[anchor] ?? l;
  // Base already on the template: nothing to warp, keep the values exact.
  if (pivot === l) return [...template];
  return template.map((t, i) => {
    if (i === anchor) return l;
    // Pinned ends are returned as-is, so float error can't nudge them.
    if (i === 0) return top;
    if (i === last) return bottom;
    if (i < anchor) {
      return pivot === top ? t : top + ((t - top) * (l - top)) / (pivot - top);
    }
    return pivot === bottom
      ? t
      : l + ((t - pivot) * (bottom - l)) / (bottom - pivot);
  });
}

function build(
  base: Oklch,
  lTemplate: readonly number[],
  cTemplate: readonly number[],
  peakChroma: (anchor: number) => number,
  anchorIsBase: boolean,
  { gamut = "rgb", hueShift = 0 }: ScaleOptions,
): Scale {
  const anchor = nearestIndex(lTemplate, base.l);
  const lightness = warpLightness(lTemplate, anchor, base.l);
  const peak = peakChroma(anchor);
  const steps = STEPS.map((_, i) => {
    if (anchorIsBase && i === anchor) return base;
    const h = base.h + (hueShift * (i - anchor)) / (STEPS.length - 1);
    const c = peak * (cTemplate[i] ?? 0);
    return mapToGamut(oklch(lightness[i] ?? base.l, c, h), gamut);
  });
  return Object.fromEntries(
    STEPS.map((step, i) => [step, steps[i]]),
  ) as unknown as Scale;
}

// Scales are pure functions of their inputs and cheap to keep, so a slider
// that only moves one colour recomputes one scale.
const cache = new Map<string, Scale>();
const CACHE_LIMIT = 128;

function memo(key: string, make: () => Scale): Scale {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const scale = make();
  cache.set(key, scale);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return scale;
}

const k = (n: number) => n.toFixed(4);

/** Scale for a brand or accent colour. The base is returned untouched. */
export function brandScale(base: Oklch, options: ScaleOptions = {}): Scale {
  const key = `b|${k(base.l)}|${k(base.c)}|${k(base.h)}|${options.gamut ?? "rgb"}|${options.hueShift ?? 0}`;
  return memo(key, () =>
    build(
      base,
      BRAND_L,
      BRAND_C,
      (anchor) => base.c / (BRAND_C[anchor] ?? 1),
      true,
      options,
    ),
  );
}

export type NeutralInput = {
  /** Hue of the grey's tint. */
  hue: number;
  /** Peak chroma of the tint; 0 is pure grey. Keep it small (≤ 0.05). */
  chroma: number;
};

/** Neutral scale on Tailwind's neutral lightness, tinted by `hue`/`chroma`. */
export function neutralScale(
  { hue, chroma }: NeutralInput,
  options: ScaleOptions = {},
): Scale {
  const key = `n|${k(hue)}|${k(chroma)}|${options.gamut ?? "rgb"}|${options.hueShift ?? 0}`;
  return memo(key, () => {
    const base = oklch(NEUTRAL_L[5], chroma, hue);
    return build(base, NEUTRAL_L, NEUTRAL_C, () => chroma, false, options);
  });
}

/** The step a colour sits on in its own scale (its anchor). */
export function nearestStep(color: Oklch): Step {
  return STEPS[nearestIndex(BRAND_L, color.l)] ?? 500;
}
