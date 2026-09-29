import { clampChroma, inGamut as culoriInGamut } from "culori/fn";
import { type Oklch, oklch } from "./convert";

export type Gamut = "rgb" | "p3";

const checks = {
  rgb: culoriInGamut("rgb"),
  p3: culoriInGamut("p3"),
} as const;

export function inGamut(color: Oklch, gamut: Gamut = "rgb"): boolean {
  return checks[gamut](color);
}

/**
 * Bring a colour into `gamut` by lowering chroma only. Lightness and hue stay
 * exactly as given, which is what the contrast bisection relies on.
 */
export function mapToGamut(color: Oklch, gamut: Gamut = "rgb"): Oklch {
  const l = Math.min(1, Math.max(0, color.l));
  const safe = l === color.l ? color : { ...color, l };
  if (checks[gamut](safe)) return safe;
  const mapped = clampChroma(safe, "oklch", gamut);
  return oklch(l, mapped.c, color.h, color.alpha);
}
