// Small shared helpers for the exporters. Pure strings, no DOM.

import { formatOklch } from "../color/convert";
import type { ResolvedTheme } from "../theme/resolve";
import { COLOR_TOKENS } from "../theme/tokens";

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** A CSS font stack with the family quoted and sensible fallbacks. */
export function fontStack(family: string, kind: "sans" | "mono"): string {
  return `"${family.replaceAll('"', "")}", ${kind === "mono" ? MONO_FALLBACK : SANS_FALLBACK}`;
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
        `tv-${name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}`,
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

export const header = (resolved: ResolvedTheme, format: string) =>
  `Thevio theme "${resolved.theme.name}" · ${format} · https://thevio.zubyr.dev`;
