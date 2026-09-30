// RawTheme → a Thevio theme that reproduces it.
//
// Seeds (brand, neutral tint, secondary, danger, charts, fonts, radius…) are
// read from the source so the theme stays editable; then every source colour
// that Thevio's derivation doesn't already reproduce is pinned as an
// override, so the user's exact colours survive (plan §F). A pasted
// shadcn default therefore needs only a handful of pins.

import type { Oklch } from "../color/convert";
import { oklch } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import {
  MODES,
  type Mode,
  resolveTheme,
  SEMANTIC_NAMES,
} from "../theme/resolve";
import { THEME_VERSION, type Theme, toColorValue } from "../theme/schema";
import { COLOR_TOKENS, type ColorToken } from "../theme/tokens";
import { validateAndFix } from "../theme/validate-and-fix";
import type { RawTheme } from "./raw";
import {
  type Lookup,
  readColor,
  readFontFamily,
  readLength,
  readShadow,
  toEm,
  toPx,
  toRem,
} from "./values";

export type ImportNote = {
  readonly level: "info" | "warning";
  readonly message: string;
};

export type Inferred = {
  readonly theme: Theme;
  readonly notes: readonly ImportNote[];
  /** Colours read from the source, per mode. */
  readonly read: Readonly<Record<Mode, number>>;
  /** How many of them had to be pinned (the rest Thevio derives exactly). */
  readonly pinned: number;
};

/** Below this OKLab distance two colours are the same (~1/20 of a JND). */
const SAME_COLOR = 0.001;

export function colorDistance(a: Oklch, b: Oklch): number {
  const ab = (color: Oklch) => {
    const rad = (color.h * Math.PI) / 180;
    return [color.l, color.c * Math.cos(rad), color.c * Math.sin(rad)];
  };
  const [l1 = 0, a1 = 0, b1 = 0] = ab(a);
  const [l2 = 0, a2 = 0, b2 = 0] = ab(b);
  const alpha = (a.alpha ?? 1) - (b.alpha ?? 1);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2, alpha);
}

const opaque = (color: Oklch) => oklch(color.l, color.c, color.h);

/** A shadow colour, or nothing for black (the default). */
const shadowColor = (color: Oklch | null) =>
  color && (color.l > 0.001 || color.c > 0.001)
    ? { color: toColorValue(opaque(color)) }
    : {};

/** Tailwind's neutral 500 carries the neutral scale's full tint (scale.ts). */
const NEUTRAL_CHROMA_AT_500 = 1;
const NEUTRAL_CHROMA_AT_950 = 0.91;
/** Below this chroma a grey counts as untinted. */
const GREY_CHROMA = 0.004;
/** From this chroma a light fill is a colour, not a tinted grey. */
const CHROMATIC_FILL = 0.03;

/** The neutral tint, from the greys that carry most of it. */
function inferNeutral(colors: ReadColors): { hue: number; chroma: number } {
  const muted = colors["muted-foreground"];
  const text = colors.foreground;
  const sample = muted
    ? { color: muted, factor: NEUTRAL_CHROMA_AT_500 }
    : text
      ? { color: text, factor: NEUTRAL_CHROMA_AT_950 }
      : null;
  if (!sample || sample.color.c < GREY_CHROMA) return { hue: 0, chroma: 0 };
  return {
    hue: sample.color.h,
    chroma: Math.min(0.05, sample.color.c / sample.factor),
  };
}

/** A mid-tone seed with the hue of a light tint (the tint is scale step 100). */
function seedFromTint(tint: Oklch): Oklch {
  // Step 100 holds 15% of the peak chroma; a seed near L 0.6 holds ~95%.
  return mapToGamut(oklch(0.6, Math.min(0.3, (tint.c / 0.15) * 0.95), tint.h));
}

type ReadColors = Partial<Record<string, Oklch>>;

function readColors(
  source: Record<string, string>,
  lookup: Lookup,
  names: readonly string[],
  notes: ImportNote[],
  mode: Mode,
): ReadColors {
  const out: ReadColors = {};
  for (const name of names) {
    const value = source[name];
    if (value === undefined) continue;
    const color = readColor(value, lookup);
    if (color) out[name] = color;
    else {
      notes.push({
        level: "warning",
        message: `Couldn't read --${name} (${mode}): "${value.slice(0, 60)}". It is derived instead.`,
      });
    }
  }
  return out;
}

const KNOWN_PREFIXES =
  /^(?:color-|radius|shadow|tracking-|font-|tv-|spacing|letter-spacing|text-|leading-|breakpoint-|container-|ease-|animate-|blur-|inset-shadow|drop-shadow)/;

export function inferTheme(raw: RawTheme, base?: Theme): Inferred {
  const notes: ImportNote[] = [];
  // `@theme inline { --font-sans: var(--font-sans) }` only re-exports :root's
  // value; skip such self-references.
  const shared = (name: string) => {
    const value = raw.theme[name];
    const selfReference = value?.replace(/\s/g, "") === `var(--${name})`;
    return (selfReference ? undefined : value) ?? raw.light[name];
  };
  const lookups: Record<Mode, Lookup> = {
    light: (name) => raw.light[name] ?? raw.theme[name],
    dark: (name) => raw.dark[name] ?? raw.light[name] ?? raw.theme[name],
  };

  const colorNames = [...COLOR_TOKENS, ...SEMANTIC_NAMES];
  // A dark block only lists what changes; the rest cascades from :root (and
  // tweakcn fills missing dark keys from light the same way). With no dark
  // block at all there is no dark mode, and Thevio derives one.
  const hasDark = colorNames.some((name) => name in raw.dark);
  const read = {
    light: readColors(raw.light, lookups.light, colorNames, notes, "light"),
    dark: hasDark
      ? readColors(
          { ...raw.light, ...raw.dark },
          lookups.dark,
          colorNames,
          notes,
          "dark",
        )
      : {},
  };

  // --- Seeds -------------------------------------------------------------
  // A base (the theme a Thevio export links to) keeps its seeds, style and
  // pins; only what the source changed is pinned on top.
  const input: Record<string, unknown> = base
    ? structuredClone(base)
    : { v: THEME_VERSION, name: "Imported" };
  if (raw.name) input.name = raw.name.slice(0, 40);

  if (!base) {
    const light = read.light;
    const either = (name: string) => light[name] ?? read.dark[name];
    const primary = either("primary");
    const secondary = light.secondary;
    const danger = either("destructive");
    const charts = [1, 2, 3, 4, 5].map((i) => light[`chart-${i}`]);
    input.colors = {
      ...(primary && { brand: toColorValue(opaque(primary)) }),
      neutral: inferNeutral(light),
      ...(secondary &&
        secondary.c >= CHROMATIC_FILL && {
          secondary: toColorValue(seedFromTint(secondary)),
        }),
      semantic: {
        ...(danger && { danger: toColorValue(opaque(danger)) }),
        ...Object.fromEntries(
          SEMANTIC_NAMES.flatMap((name) => {
            const color = light[name];
            return color ? [[name, toColorValue(opaque(color))]] : [];
          }),
        ),
      },
      ...(charts.every(Boolean) && {
        chart: charts.map((c) => toColorValue(opaque(c as Oklch))),
      }),
    };
    if (!primary) {
      notes.push({
        level: "warning",
        message: "No --primary found: kept the default brand colour.",
      });
    }
  }

  // --- Shape, type and depth (exact values always win over the base) ------
  const radius = toRem(readLength(shared("radius")));
  if (radius !== null) input.radius = radius;
  const spacing = toRem(readLength(shared("spacing")));
  if (spacing !== null) input.spacing = spacing;
  const trackingRaw = shared("letter-spacing") ?? shared("tracking-normal");
  const tracking = /^\s*normal\s*$/i.test(trackingRaw ?? "")
    ? 0
    : toEm(readLength(trackingRaw));
  if (tracking !== null) input.letterSpacing = tracking;

  const fonts: Record<string, string> = {
    ...((input.fonts as Record<string, string> | undefined) ?? {}),
  };
  for (const role of ["sans", "mono", "heading"] as const) {
    const value = shared(`font-${role}`);
    const family = readFontFamily(value, lookups.light);
    // Heading falls back to sans; keep it implicit so equal themes stay equal.
    if (role === "heading" && family === fonts.sans) delete fonts.heading;
    else if (family) fonts[role] = family;
    else if (value) {
      notes.push({
        level: "info",
        message: `--font-${role} is a system font stack; kept ${base ? "the theme's" : "the default"} ${role} font.`,
      });
    }
  }
  if (shared("font-serif")) {
    notes.push({
      level: "info",
      message:
        "--font-serif was skipped: Thevio themes have sans, mono and heading fonts.",
    });
  }
  input.fonts = fonts;

  const shadow = inferShadow(shared, lookups.light);
  if (shadow) {
    input.shadow = {
      ...((input.shadow as object | undefined) ?? {}),
      ...shadow,
    };
  }

  // --- Validate, then pin what derivation doesn't reproduce ---------------
  const validated = validateAndFix(input, { contrast: false });
  if (!validated.ok) throw new Error(validated.error);
  for (const fix of validated.fixes) {
    if (fix.kind === "schema") {
      notes.push({ level: "warning", message: `${fix.path}: ${fix.message}` });
    }
  }

  const derived = resolveTheme(validated.theme);
  const overrides: Theme["overrides"] = {};
  let pinned = 0;
  for (const mode of MODES) {
    const pins: Partial<Record<ColorToken, ReturnType<typeof toColorValue>>> = {
      ...validated.theme.overrides[mode],
    };
    for (const token of COLOR_TOKENS) {
      const color = read[mode][token];
      if (!color) continue;
      if (colorDistance(color, derived.colors[mode][token]) > SAME_COLOR) {
        pins[token] = toColorValue(color);
        pinned++;
      }
    }
    if (Object.keys(pins).length > 0) overrides[mode] = pins;
  }

  const semanticPins = MODES.flatMap((mode) =>
    SEMANTIC_NAMES.filter((name) => {
      const color = read[mode][name];
      return (
        mode === "dark" &&
        color &&
        colorDistance(color, derived.semantic.dark[name]) > SAME_COLOR
      );
    }),
  );
  if (semanticPins.length > 0) {
    notes.push({
      level: "info",
      message: `Dark ${semanticPins.join(", ")} are derived from the light colour; the source's dark values were not kept.`,
    });
  }

  const unknown = [
    ...new Set([
      ...Object.keys(raw.light),
      ...Object.keys(raw.dark),
      ...Object.keys(raw.theme),
    ]),
  ].filter(
    (name) =>
      !(colorNames as readonly string[]).includes(name) &&
      !name.endsWith("-foreground") &&
      !KNOWN_PREFIXES.test(name),
  );
  if (unknown.length > 0) {
    const shown = unknown.slice(0, 6).map((name) => `--${name}`);
    notes.push({
      level: "info",
      message: `Skipped variables Thevio doesn't use: ${shown.join(", ")}${unknown.length > shown.length ? ` and ${unknown.length - shown.length} more` : ""}.`,
    });
  }
  if (Object.keys(read.dark).length === 0) {
    notes.push({
      level: "info",
      message: "No dark mode in the source: Thevio derived one.",
    });
  }
  if (raw.ignored > 0) {
    notes.push({
      level: "info",
      message: `Ignored ${raw.ignored} variable${raw.ignored === 1 ? "" : "s"} outside :root, .dark and @theme.`,
    });
  }

  const theme: Theme = { ...validated.theme, overrides };
  return {
    theme,
    notes,
    read: {
      light: Object.keys(read.light).length,
      dark: Object.keys(read.dark).length,
    },
    pinned,
  };
}

/**
 * tweakcn's six shadow inputs (JSON says `shadow-offset-x`, its CSS says
 * `--shadow-x`), or else the first layer of a composed shadow.
 */
function inferShadow(
  shared: (name: string) => string | undefined,
  lookup: Lookup,
): Record<string, unknown> | null {
  const px = (...names: string[]) => {
    for (const name of names) {
      const value = toPx(readLength(shared(name)));
      if (value !== null) return value;
    }
    return null;
  };
  const x = px("shadow-offset-x", "shadow-x");
  const y = px("shadow-offset-y", "shadow-y");
  const blur = px("shadow-blur");
  const spread = px("shadow-spread");
  const opacityRaw = shared("shadow-opacity");
  const colorRaw = shared("shadow-color");
  if (x !== null || y !== null || blur !== null || opacityRaw !== undefined) {
    const color = colorRaw ? readColor(colorRaw, lookup) : null;
    const opacity = opacityRaw === undefined ? NaN : Number(opacityRaw);
    return {
      ...(x !== null && { x }),
      ...(y !== null && { y }),
      ...(blur !== null && { blur }),
      ...(spread !== null && { spread }),
      ...(Number.isFinite(opacity) && { opacity }),
      ...shadowColor(color),
    };
  }
  const composed = shared("shadow-sm") ?? shared("shadow");
  const layer = composed ? readShadow(composed, lookup) : null;
  if (!layer) return null;
  return {
    x: layer.x,
    y: layer.y,
    blur: layer.blur,
    spread: layer.spread,
    ...(layer.color && { opacity: layer.color.alpha ?? 1 }),
    ...shadowColor(layer.color),
  };
}
