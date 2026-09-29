// Dark-mode rules. Dark mode is derived, not mirrored: surfaces get lighter as
// they rise, borders become white overlays, and accents move to a lighter,
// calmer step of their own scale. The fixer re-checks everything afterwards.

import { contrastRatio } from "../contrast/wcag";
import { type Oklch, oklch } from "./convert";
import { type Gamut, mapToGamut } from "./gamut";
import { brandScale, type NeutralInput, nearestStep, type Step } from "./scale";

/** Dark neutral lightness per role (shadcn's values). */
export const DARK_NEUTRAL_L = {
  background: 0.145,
  /** Card and popover: one elevation up, so lighter than the page. */
  surface: 0.205,
  /** Muted, secondary and accent fills. */
  subtle: 0.269,
  foreground: 0.985,
  mutedForeground: 0.708,
  ring: 0.556,
} as const;

/** Borders and inputs in dark mode are white overlays at these opacities. */
export const DARK_OVERLAY_ALPHA = { border: 0.1, input: 0.15 } as const;

/** Dark surfaces keep the neutral's hue but never more tint than this. */
const DARK_NEUTRAL_MAX_CHROMA = 0.02;

/** A dark-mode neutral at lightness `l`, tinted like the light neutral. */
export function darkNeutral(l: number, { hue, chroma }: NeutralInput): Oklch {
  return oklch(l, Math.min(chroma, DARK_NEUTRAL_MAX_CHROMA), hue);
}

/** A white overlay, used for dark borders and inputs. */
export function whiteOverlay(alpha: number): Oklch {
  return oklch(1, 0, 0, alpha);
}

/** Saturated colours look louder on dark backgrounds; calm them above this. */
const SATURATED_CHROMA = 0.2;
const DARK_DESATURATE = 0.85;

export type DarkAccentOptions = {
  /** Light-mode page background. */
  lightBg: Oklch;
  /** Dark-mode page background. */
  darkBg: Oklch;
  /** Contrast the colour needs against the page (3 for fills, 4.5 for text). */
  min: number;
  gamut?: Gamut;
};

/**
 * Dark-mode version of a brand or accent colour. If it already reaches `min`
 * on both page backgrounds it stays identical (best brand fidelity).
 * Otherwise it takes the mirrored step of its own scale (600 → 400, clamped
 * to 300–500) and, if very saturated, loses a little chroma.
 */
export function darkAccent(
  color: Oklch,
  { lightBg, darkBg, min, gamut = "rgb" }: DarkAccentOptions,
): Oklch {
  if (
    contrastRatio(color, lightBg) >= min &&
    contrastRatio(color, darkBg) >= min
  ) {
    return color;
  }
  const mirrored = Math.min(
    500,
    Math.max(300, 1000 - nearestStep(color)),
  ) as Step;
  const step = brandScale(color, { gamut })[mirrored];
  const c = step.c > SATURATED_CHROMA ? step.c * DARK_DESATURATE : step.c;
  return mapToGamut(oklch(step.l, c, step.h), gamut);
}
