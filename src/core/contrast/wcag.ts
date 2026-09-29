// WCAG 2 contrast. It's the only metric Thevio gates on (see decisions §3).

import { wcagContrast } from "culori/fn";
import { type Oklch, toRgb } from "../color/convert";
import { mapToGamut } from "../color/gamut";

/** WCAG 2.x minimums. */
export const WCAG = {
  /** 1.4.3 normal text (AA). */
  text: 4.5,
  /** 1.4.3 large text: ≥ 24px, or ≥ 18.66px bold (AA). */
  largeText: 3,
  /** 1.4.11 UI components and graphics: borders, focus rings, chart marks. */
  ui: 3,
  /** 1.4.6 normal text (AAA). */
  enhancedText: 7,
} as const;

/**
 * The opaque colour a viewer actually sees: `fg` over an opaque `bg`, blended
 * in gamma-encoded sRGB like browsers do.
 */
function composite(fg: Oklch, bg: Oklch) {
  const back = toRgb(mapToGamut(bg));
  const front = toRgb(mapToGamut(fg));
  const a = fg.alpha ?? 1;
  if (a >= 1) return front;
  return {
    mode: "rgb" as const,
    r: front.r * a + back.r * (1 - a),
    g: front.g * a + back.g * (1 - a),
    b: front.b * a + back.b * (1 - a),
  };
}

/**
 * WCAG 2 contrast ratio (1–21) of `fg` on `bg`. Both are measured in sRGB
 * after gamut mapping; a translucent `fg` is composited over `bg` first.
 * `bg` is treated as opaque.
 */
export function contrastRatio(fg: Oklch, bg: Oklch): number {
  const back = toRgb(mapToGamut({ ...bg, alpha: 1 }));
  return wcagContrast(composite(fg, bg), back);
}
