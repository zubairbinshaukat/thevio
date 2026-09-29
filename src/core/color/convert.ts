// Colour primitives for the engine. Everything is OKLCH in, OKLCH out; other
// spaces are only for measuring (sRGB for WCAG) and for output (hex).
//
// culori/fn is the tree-shakeable build: only the modes registered here exist.

import {
  clampRgb,
  converter,
  formatHex as culoriFormatHex,
  parse as culoriParse,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeP3,
  modeRgb,
  type Rgb,
  // Not a React hook, despite the name: it registers a colour space.
  useMode as registerMode,
} from "culori/fn";

registerMode(modeRgb);
registerMode(modeLrgb);
registerMode(modeOklab);
registerMode(modeP3);
registerMode(modeOklch);

const toOklchRaw = converter("oklch");
const toRgbRaw = converter("rgb");

/** An OKLCH colour. `h` is always a number (0 for achromatic colours). */
export type Oklch = {
  readonly mode: "oklch";
  readonly l: number;
  readonly c: number;
  readonly h: number;
  readonly alpha?: number;
};

export function oklch(l: number, c: number, h: number, alpha?: number): Oklch {
  const hue = ((h % 360) + 360) % 360;
  return alpha === undefined || alpha >= 1
    ? { mode: "oklch", l, c, h: hue }
    : { mode: "oklch", l, c, h: hue, alpha };
}

type CuloriColor = Exclude<Parameters<typeof toOklchRaw>[0], string>;

/** Any culori colour object as OKLCH. */
export function toOklch(color: CuloriColor): Oklch {
  const out = toOklchRaw(color);
  if (!out) throw new Error(`Can't convert ${JSON.stringify(color)} to OKLCH`);
  return oklch(out.l, out.c, out.h ?? 0, out.alpha);
}

/** Parse a CSS colour string (hex, rgb(), oklch(), named). Null if invalid. */
export function parseColor(input: string): Oklch | null {
  const parsed = culoriParse(input.trim());
  return parsed ? toOklch(parsed) : null;
}

/** sRGB, clipped into the 0–1 cube. Map to gamut first if fidelity matters. */
export function toRgb(color: Oklch): Rgb {
  return clampRgb(toRgbRaw(color));
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** `oklch(0.5432 0.1234 250.12)`, with ` / 10%` when translucent. */
export function formatOklch(color: Oklch): string {
  const l = round(color.l, 4);
  const c = round(color.c, 4);
  const h = c === 0 ? 0 : round(color.h, 2);
  const alpha =
    color.alpha === undefined || color.alpha >= 1
      ? ""
      : ` / ${round(color.alpha * 100, 2)}%`;
  return `oklch(${l} ${c} ${h}${alpha})`;
}

/** `#rrggbb`, ignoring alpha. Callers map to the sRGB gamut first. */
export function formatHex(color: Oklch): string {
  return culoriFormatHex(toRgb(color));
}
