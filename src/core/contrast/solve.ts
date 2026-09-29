// Minimal colour changes that reach a contrast target. Hue is always kept;
// chroma only drops where the gamut forces it.

import { type Oklch, oklch } from "../color/convert";
import { type Gamut, mapToGamut } from "../color/gamut";
import { contrastRatio } from "./wcag";

/**
 * Fixes aim this far above the minimum, so rounding a fixed colour for a URL
 * or a CSS file can never tip it back under the line.
 */
export const FIX_MARGIN = 0.01;

// 24 halvings of a 0–1 range: ~6e-8, far below any visible or rounded step.
const ITERATIONS = 24;

/** Bisect between a failing and a passing value; returns the passing end. */
function bisect(
  failing: number,
  passing: number,
  passes: (value: number) => boolean,
): number {
  let lo = failing;
  let hi = passing;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (passes(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * Move `fg` in OKLCH lightness only, until it reaches `min` against `bg`.
 * Keeps its light/dark polarity against `bg` when that's feasible, otherwise
 * crosses over. Returns `fg` unchanged if it already passes, or null if no
 * lightness at this hue can pass (the background has to move instead).
 */
export function fixLightness(
  fg: Oklch,
  bg: Oklch,
  min: number,
  gamut: Gamut = "rgb",
): Oklch | null {
  if (contrastRatio(fg, bg) >= min) return fg;
  const target = min + FIX_MARGIN;
  const at = (l: number) => mapToGamut(oklch(l, fg.c, fg.h, fg.alpha), gamut);
  const passes = (l: number) => contrastRatio(at(l), bg) >= target;

  const darker = fg.l <= bg.l;
  // Same side as now: start from fg, which fails, and walk away from bg.
  // Other side: start from bg's lightness, where contrast is ~1.
  const attempts = [
    { from: fg.l, to: darker ? 0 : 1 },
    { from: bg.l, to: darker ? 1 : 0 },
  ];
  for (const { from, to } of attempts) {
    if (!passes(to)) continue;
    return at(bisect(from, to, passes));
  }
  return null;
}

/**
 * For a translucent `fg` (e.g. a white-at-10% border): raise its opacity until
 * it reaches `min`, keeping its colour. Null if even fully opaque fails.
 */
export function fixAlpha(fg: Oklch, bg: Oklch, min: number): Oklch | null {
  const alpha = fg.alpha ?? 1;
  if (contrastRatio(fg, bg) >= min) return fg;
  if (alpha >= 1) return null;
  const target = min + FIX_MARGIN;
  const at = (a: number) => oklch(fg.l, fg.c, fg.h, a);
  const passes = (a: number) => contrastRatio(at(a), bg) >= target;
  if (!passes(1)) return null;
  return at(bisect(alpha, 1, passes));
}

/**
 * The smallest fix for `fg`: opacity first for translucent tokens (keeps the
 * overlay look), then lightness. Null when `fg` can't reach `min` on `bg`.
 */
export function fixForeground(
  fg: Oklch,
  bg: Oklch,
  min: number,
  gamut: Gamut = "rgb",
): Oklch | null {
  if ((fg.alpha ?? 1) < 1) {
    const viaAlpha = fixAlpha(fg, bg, min);
    if (viaAlpha) return viaAlpha;
    return fixLightness(oklch(fg.l, fg.c, fg.h), bg, min, gamut);
  }
  return fixLightness(fg, bg, min, gamut);
}

const WHITE = oklch(1, 0, 0);
const BLACK = oklch(0, 0, 0);

/**
 * Text colour for a filled surface (e.g. primary-foreground on primary).
 * Prefers a near-white or near-black tinted with the surface's hue; falls back
 * to pure white or black, whichever contrasts more. The result may still be
 * under `min` for mid-lightness surfaces; then the surface itself must move.
 */
export function pickOnColor(bg: Oklch, min = 4.5, gamut: Gamut = "rgb"): Oklch {
  const tinted = [
    mapToGamut(oklch(0.985, Math.min(bg.c * 0.1, 0.02), bg.h), gamut),
    mapToGamut(oklch(0.205, Math.min(bg.c * 0.25, 0.04), bg.h), gamut),
  ];
  const score = (color: Oklch) => contrastRatio(color, bg);
  const best = (colors: Oklch[]) =>
    colors.reduce((a, b) => (score(b) > score(a) ? b : a));

  const passingTinted = tinted.filter((color) => score(color) >= min);
  if (passingTinted.length > 0) return best(passingTinted);
  return best([...tinted, WHITE, BLACK]);
}
