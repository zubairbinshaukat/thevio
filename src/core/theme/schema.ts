// The theme a user builds. One schema serves the URL, the API and the Studio.
//
// Three layers (see functionality-plan §B):
// - ThemeInput: what the user chose. Partial, messy input is fine.
// - Theme: ThemeInput with every default filled in. This is what's stored.
// - ResolvedTheme (resolve.ts): derived, never stored.
//
// Defaults use `.prefault()`, which runs the default through the schema (so a
// "#hex" default is converted like user input). zod 4's `.default()` would
// return it untouched.

import * as z from "zod";
import { type Oklch, oklch, parseColor } from "../color/convert";
import { COLOR_TOKENS } from "./tokens";

export const THEME_VERSION = 1;

// ---------------------------------------------------------------------------
// Colours: stored as OKLCH tuples, rounded, so equal themes serialise equally.

/** `[l, c, h]` or `[l, c, h, alpha]`. */
export type ColorValue =
  | readonly [number, number, number]
  | readonly [number, number, number, number];

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Canonical form: clamped, rounded, grey hue 0, opaque alpha dropped. */
export function normalizeColor(
  l: number,
  c: number,
  h: number,
  alpha = 1,
): ColorValue {
  const cc = round(Math.min(0.5, Math.max(0, c)), 4);
  const hh = cc === 0 ? 0 : round(((h % 360) + 360) % 360, 2) % 360;
  const ll = round(Math.min(1, Math.max(0, l)), 4);
  const aa = round(Math.min(1, Math.max(0, alpha)), 3);
  return aa >= 1 ? [ll, cc, hh] : [ll, cc, hh, aa];
}

export function fromColorValue([l, c, h, alpha]: ColorValue): Oklch {
  return oklch(l, c, h, alpha);
}

export function toColorValue(color: Oklch): ColorValue {
  return normalizeColor(color.l, color.c, color.h, color.alpha);
}

const finite = z.number().finite();

/** A number in [min, max]. -0 becomes 0, so equal themes serialise equally. */
const range = (min: number, max: number) =>
  finite
    .min(min)
    .max(max)
    .transform((n) => n + 0);

/**
 * A colour: an OKLCH tuple, or any CSS colour string (hex, rgb(), hsl(),
 * oklch(), named). Always stored as a rounded OKLCH tuple.
 */
export const Color = z
  .union([
    z.tuple([finite, finite, finite]),
    z.tuple([finite, finite, finite, finite]),
    z.string().max(64),
  ])
  .transform((value, ctx): ColorValue => {
    if (typeof value !== "string") {
      const [l, c, h, alpha] = value;
      return normalizeColor(l, c, h, alpha);
    }
    const parsed = parseColor(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: `Not a colour: "${value}"` });
      return z.NEVER;
    }
    return normalizeColor(parsed.l, parsed.c, parsed.h, parsed.alpha);
  })
  .describe(
    'OKLCH tuple [lightness 0-1, chroma 0-0.5, hue 0-360] or any CSS colour, e.g. "#2563eb".',
  );

// ---------------------------------------------------------------------------
// Component style tokens (decisions §4.1). Enums, so they encode as one digit.

export const SURFACE_STYLES = ["border", "shadow", "both", "flat"] as const;
export const DENSITIES = ["compact", "default", "comfortable"] as const;
export const BUTTON_SHAPES = ["square", "rounded", "pill"] as const;
export const BUTTON_STYLES = ["solid", "soft", "outline"] as const;
export const INPUT_STYLES = ["outline", "filled", "underline"] as const;
export const FOCUS_RINGS = ["ring", "outline", "glow"] as const;
export const TAB_STYLES = ["underline", "pill", "segmented"] as const;
export const CHART_STYLES = ["spectrum", "monochrome"] as const;
export const RING_SOURCES = ["neutral", "brand"] as const;

export const DEFAULT_BRAND = "#2563eb";

// ---------------------------------------------------------------------------

type ObjectFactory = typeof z.object | typeof z.strictObject;

/**
 * Built twice: lenient (unknown keys dropped) for URLs, strict (unknown keys
 * rejected) at the API boundary.
 */
function buildSchema(object: ObjectFactory) {
  const overrides = z
    .partialRecord(z.enum(COLOR_TOKENS), Color)
    .describe("Pinned colours for this mode, keyed by shadcn token name.");

  return object({
    v: z.literal(THEME_VERSION).describe("Schema version."),
    name: z.string().trim().max(40).default("Untitled"),
    colors: object({
      brand: Color.prefault(DEFAULT_BRAND).describe(
        "The brand colour. Becomes `primary`, and seeds the chart palette.",
      ),
      neutral: object({
        hue: range(0, 360).default(0),
        chroma: range(0, 0.05).default(0),
      })
        .prefault({})
        .describe("Tint of the greys. Chroma 0 is pure grey."),
      secondary: Color.optional().describe(
        "Optional second colour. Tints the secondary and accent fills.",
      ),
      semantic: object({
        danger: Color.prefault([0.577, 0.245, 27.33]),
        success: Color.prefault([0.627, 0.17, 149.21]),
        warning: Color.prefault([0.769, 0.165, 70.08]),
        info: Color.prefault([0.588, 0.158, 241.97]),
      }).prefault({}),
      chart: z
        .tuple([Color, Color, Color, Color, Color])
        .optional()
        .describe("Five explicit chart colours. Derived from brand if absent."),
      chartStyle: z.enum(CHART_STYLES).default("spectrum"),
    }).prefault({}),
    fonts: object({
      sans: z.string().trim().min(1).max(60).default("Inter"),
      mono: z.string().trim().min(1).max(60).default("JetBrains Mono"),
      heading: z.string().trim().min(1).max(60).optional(),
    })
      .prefault({})
      .describe("Google Fonts family names."),
    radius: range(0, 2).default(0.625).describe("Base corner radius in rem."),
    letterSpacing: range(-0.1, 0.2)
      .default(0)
      .describe("Letter spacing in em."),
    spacing: range(0.15, 0.4)
      .default(0.25)
      .describe("Tailwind v4 --spacing unit in rem."),
    shadow: object({
      x: range(-20, 20).default(0),
      y: range(-20, 20).default(1),
      blur: range(0, 50).default(3),
      spread: range(-20, 20).default(0),
      opacity: range(0, 1).default(0.1),
      color: Color.optional(),
    })
      .prefault({})
      .describe("Base shadow in px; the 2xs-2xl scale is derived from it."),
    border: object({ width: range(0, 4).default(1) }).prefault({}),
    states: object({
      hoverShift: range(0, 0.2).default(0.05),
      focusRing: z.enum(RING_SOURCES).default("neutral"),
    }).prefault({}),
    components: object({
      surfaceStyle: z.enum(SURFACE_STYLES).default("border"),
      density: z.enum(DENSITIES).default("default"),
      buttonShape: z.enum(BUTTON_SHAPES).default("rounded"),
      buttonStyle: z.enum(BUTTON_STYLES).default("solid"),
      inputStyle: z.enum(INPUT_STYLES).default("outline"),
      focusRing: z.enum(FOCUS_RINGS).default("ring"),
      tabStyle: z.enum(TAB_STYLES).default("segmented"),
    })
      .prefault({})
      .describe("How components look. The defaults are the shadcn style."),
    overrides: object({
      light: overrides.optional(),
      dark: overrides.optional(),
    })
      // An empty map pins nothing; drop it so equal themes look equal.
      .transform(({ light, dark }) => ({
        ...(light && Object.keys(light).length > 0 ? { light } : {}),
        ...(dark && Object.keys(dark).length > 0 ? { dark } : {}),
      }))
      .prefault({})
      .describe("Sparse, per-mode pinned colours. Imports land here."),
  });
}

/** Lenient: unknown keys are dropped. Use for URLs and stored data. */
export const ThemeSchemaV1 = buildSchema(z.object);
/** Strict: unknown keys are errors. Use at the API boundary. */
export const StrictThemeSchemaV1 = buildSchema(z.strictObject);

export type ThemeInput = z.input<typeof ThemeSchemaV1>;
export type Theme = z.output<typeof ThemeSchemaV1>;
