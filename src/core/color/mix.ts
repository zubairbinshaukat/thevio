// Mixing in OKLCH, with the same maths as CSS `color-mix(in oklch, …)`:
// shorter hue arc, and an achromatic colour's hue counts as "missing" (it
// takes the other colour's hue). Used for derived component colours, which
// must be computed here rather than in CSS so their contrast can be checked.

import { type Oklch, oklch } from "./convert";

/** Below this chroma a colour has no meaningful hue. */
const ACHROMATIC = 1e-4;

/** `a` mixed with `amount` (0–1) of `b`. */
export function mixOklch(a: Oklch, b: Oklch, amount: number): Oklch {
  const t = Math.min(1, Math.max(0, amount));
  const aAlpha = a.alpha ?? 1;
  const bAlpha = b.alpha ?? 1;
  const alpha = aAlpha * (1 - t) + bAlpha * t;

  // Hue: missing on an achromatic side; otherwise the shorter arc.
  const aGrey = a.c < ACHROMATIC;
  const bGrey = b.c < ACHROMATIC;
  let h: number;
  if (aGrey && bGrey) h = 0;
  else if (aGrey) h = b.h;
  else if (bGrey) h = a.h;
  else {
    let delta = b.h - a.h;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    h = a.h + delta * t;
  }

  // Lightness and chroma are premultiplied by alpha, as in CSS.
  const premul = (x: number, y: number) =>
    alpha === 0 ? 0 : (x * aAlpha * (1 - t) + y * bAlpha * t) / alpha;
  return oklch(premul(a.l, b.l), premul(a.c, b.c), h, alpha);
}
