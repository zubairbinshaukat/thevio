// Small shared helpers for the exporters. Pure strings, no DOM.

import { encodeTheme } from "../codec/encode";
import { formatOklch, type Oklch } from "../color/convert";
import { STEPS } from "../color/scale";
import type { ResolvedTheme } from "../theme/resolve";
import { COLOR_TOKENS } from "../theme/tokens";

/** `softBg` → `soft-bg`, the name the CSS variables use after `--tv-`. */
export const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);

/** One file of an export. Multi-file formats return several. */
export type ExportFile = {
  /** Relative path inside the export, e.g. `tokens/light.tokens.json`. */
  readonly path: string;
  readonly contents: string;
  /** Media type, for downloads. */
  readonly type: string;
};

export const jsonFile = (
  path: string,
  data: unknown,
  type = "application/json",
): ExportFile => ({
  path,
  contents: `${JSON.stringify(data, null, 2)}\n`,
  type,
});

/** A theme name as a file or registry slug: `Grove Dark!` → `grove-dark`. */
export function slug(name: string): string {
  const out = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return out || "theme";
}

/**
 * Where each scale colour lives, keyed by its printed value, so semantic
 * tokens that land exactly on a scale step can be written as references
 * (`primary` → `brand.600`). Brand wins over neutral for shared values.
 */
export function scaleIndex(
  resolved: ResolvedTheme,
): ReadonlyMap<string, readonly [scale: string, step: string]> {
  const index = new Map<string, readonly [string, string]>();
  const { brand, secondary, neutral } = resolved.scales;
  for (const [name, scale] of [
    ["brand", brand],
    ["secondary", secondary],
    ["neutral", neutral],
  ] as const) {
    if (!scale) continue;
    for (const step of STEPS) {
      const key = formatOklch(scale[step]);
      if (!index.has(key)) index.set(key, [name, String(step)]);
    }
  }
  return index;
}

export const lookupScale = (
  index: ReturnType<typeof scaleIndex>,
  color: Oklch,
) => index.get(formatOklch(color)) ?? null;

/** The scales a theme has, in export order. */
export function scalesOf(resolved: ResolvedTheme) {
  const { brand, secondary, neutral } = resolved.scales;
  return [
    ["brand", brand],
    ...(secondary ? ([["secondary", secondary]] as const) : []),
    ["neutral", neutral],
  ] as const;
}

/** `2.25rem` / `3px` → number + unit; null for anything else. */
export function parseCssLength(
  value: string,
): { value: number; unit: "rem" | "px" } | null {
  const match = /^(-?\d*\.?\d+)(rem|px)$/.exec(value.trim());
  return match
    ? { value: Number(match[1]), unit: match[2] as "rem" | "px" }
    : null;
}

const SANS_FALLBACK = ["ui-sans-serif", "system-ui", "sans-serif"];
const MONO_FALLBACK = ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"];

/** The family, then sensible fallbacks. */
export function fontFamilies(family: string, kind: "sans" | "mono"): string[] {
  return [
    family.replaceAll('"', ""),
    ...(kind === "mono" ? MONO_FALLBACK : SANS_FALLBACK),
  ];
}

/** A CSS font stack with the family quoted and sensible fallbacks. */
export function fontStack(family: string, kind: "sans" | "mono"): string {
  const [first, ...rest] = fontFamilies(family, kind);
  return [`"${first}"`, ...rest].join(", ");
}

const rem = (value: number) => `${value}rem`;
const em = (value: number) => `${value}em`;

/** Every custom property one mode needs, in export order. */
export function modeVars(
  resolved: ResolvedTheme,
  mode: "light" | "dark",
): [string, string][] {
  const colors = resolved.colors[mode];
  const semantic = resolved.semantic[mode];
  return [
    ...COLOR_TOKENS.map((token): [string, string] => [
      token,
      formatOklch(colors[token]),
    ]),
    ...Object.entries(semantic).map(([name, color]): [string, string] => [
      name,
      formatOklch(color),
    ]),
    ...Object.entries(resolved.components.colors[mode]).map(
      ([name, color]): [string, string] => [
        `tv-${kebab(name)}`,
        formatOklch(color),
      ],
    ),
  ];
}

/** Mode-independent properties: shape, type, depth and component tokens. */
export function sharedVars(resolved: ResolvedTheme): [string, string][] {
  return [
    ["radius", rem(resolved.radius.base)],
    ["font-sans", fontStack(resolved.fonts.sans, "sans")],
    ["font-mono", fontStack(resolved.fonts.mono, "mono")],
    ["font-heading", fontStack(resolved.fonts.heading, "sans")],
    ["tracking-normal", em(resolved.letterSpacing)],
    ["spacing", rem(resolved.spacing)],
    ...Object.entries(resolved.shadows).map(
      ([size, value]): [string, string] => [`shadow-${size}`, value],
    ),
    ...Object.entries(resolved.components.vars).map(
      ([name, value]): [string, string] => [name.replace(/^--/, ""), value],
    ),
  ];
}

export const SITE = "https://thevio.zubyr.dev";

/**
 * The theme's share link. Every export carries it, so pasting any export
 * back into Thevio restores the theme exactly (core/import).
 */
export const studioLink = (resolved: ResolvedTheme) =>
  `${SITE}/studio?t=${encodeTheme(resolved.theme)}`;

export const header = (resolved: ResolvedTheme, format: string) =>
  `Thevio theme "${resolved.theme.name}" · ${format} · ${studioLink(resolved)}`;
