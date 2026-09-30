// Interpreting the value strings pasted themes contain: colours in every
// syntax shadcn themes have used (bare HSL channels from the Tailwind v3 era,
// hsl(), oklch(), hex…), lengths, font stacks and box shadows.

import {
  modeHwb,
  modeLab,
  modeLch,
  // Not a React hook, despite the name: it registers a colour space.
  useMode as registerMode,
} from "culori/fn";
import { type Oklch, parseColor } from "../color/convert";

// Rare in themes, so registered here rather than in every bundle.
registerMode(modeHwb);
registerMode(modeLab);
registerMode(modeLch);

export type Lookup = (name: string) => string | undefined;

/** Longest `var()` chain followed before giving up (also stops cycles). */
const MAX_VAR_DEPTH = 12;

/** Index of the `)` closing the `(` at `open`, or -1. */
function closing(value: string, open: number): number {
  let depth = 0;
  for (let i = open; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** Index of the first comma not inside parentheses, or -1. */
function topLevelComma(value: string): number {
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) return i;
  }
  return -1;
}

/** Split at top-level commas. */
export function splitList(value: string): string[] {
  const parts: string[] = [];
  let rest = value;
  for (let at = topLevelComma(rest); at >= 0; at = topLevelComma(rest)) {
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at + 1);
  }
  parts.push(rest.trim());
  return parts.filter(Boolean);
}

/**
 * Substitute every `var(--name, fallback)`. Null when a variable is neither
 * defined nor given a fallback, or the chain loops.
 */
export function resolveVars(
  value: string,
  lookup: Lookup,
  depth = 0,
): string | null {
  const start = value.search(/var\(/i);
  if (start < 0) return value;
  if (depth >= MAX_VAR_DEPTH) return null;
  const open = start + 3;
  const end = closing(value, open);
  if (end < 0) return null;
  const inner = value.slice(open + 1, end);
  const comma = topLevelComma(inner);
  const name = (comma < 0 ? inner : inner.slice(0, comma))
    .trim()
    .replace(/^--/, "");
  const fallback = comma < 0 ? null : inner.slice(comma + 1).trim();
  const found = lookup(name);
  const replacement =
    found !== undefined
      ? resolveVars(found, lookup, depth + 1)
      : fallback !== null
        ? resolveVars(fallback, lookup, depth + 1)
        : null;
  if (replacement === null) return null;
  return resolveVars(
    value.slice(0, start) + replacement + value.slice(end + 1),
    lookup,
    depth + 1,
  );
}

const NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const ALPHA = String.raw`(?:\s*[/,]\s*(${NUM}%?))?`;
/** `222.2 47.4% 11.2%`: shadcn's pre-v4 channels, meant for `hsl(var(--x))`. */
const BARE_HSL = new RegExp(
  String.raw`^(${NUM})(?:deg)?[\s,]+(${NUM})%[\s,]+(${NUM})%${ALPHA}$`,
  "i",
);
/** `0.62 0.19 255` or `62% 0.19 255`, meant for `oklch(var(--x))`. */
const BARE_TRIPLE = new RegExp(
  String.raw`^(${NUM})(%?)\s+(${NUM})\s+(${NUM})${ALPHA}$`,
  "i",
);

/** Wrap bare channel lists in the function they were written for. */
function unwrapChannels(value: string): string {
  const hsl = BARE_HSL.exec(value);
  if (hsl) {
    const [, h, s, l, a] = hsl;
    return `hsl(${h} ${s}% ${l}%${a ? ` / ${a}` : ""})`;
  }
  const triple = BARE_TRIPLE.exec(value);
  if (triple) {
    const [, first, percent, second, third, a] = triple;
    const alpha = a ? ` / ${a}` : "";
    const x = Number(first);
    // Lightness is 0–1 (or a percentage); rgb channels are 0–255.
    if (percent || x <= 1)
      return `oklch(${first}${percent} ${second} ${third}${alpha})`;
    return `rgb(${first} ${second} ${third}${alpha})`;
  }
  return value;
}

/** Any colour value a theme may hold, after `var()` substitution. */
export function readColor(value: string, lookup: Lookup): Oklch | null {
  const resolved = resolveVars(value.trim(), lookup);
  if (resolved === null) return null;
  return parseColor(unwrapChannels(resolved.trim()));
}

export type Length = { readonly value: number; readonly unit: string };

const LENGTH = new RegExp(`^(${NUM})(px|rem|em|%)?$`, "i");

export function readLength(value: string | undefined): Length | null {
  if (value === undefined) return null;
  const match = LENGTH.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  const unit = (match[2] ?? "").toLowerCase();
  // A bare number is only a length when it is zero.
  if (!Number.isFinite(n) || (unit === "" && n !== 0)) return null;
  return { value: n, unit };
}

const ROOT_FONT_PX = 16;

/** A length in rem (em taken as rem: themes set these on the root). */
export function toRem(length: Length | null): number | null {
  if (!length) return null;
  if (length.unit === "px") return length.value / ROOT_FONT_PX;
  if (length.unit === "%") return null;
  return length.value;
}

/** A letter spacing in em. */
export function toEm(length: Length | null): number | null {
  if (!length) return null;
  if (length.unit === "px") return length.value / ROOT_FONT_PX;
  if (length.unit === "%") return length.value / 100;
  return length.value;
}

export function toPx(length: Length | null): number | null {
  if (!length) return null;
  if (length.unit === "rem" || length.unit === "em") {
    return length.value * ROOT_FONT_PX;
  }
  if (length.unit === "%") return null;
  return length.value;
}

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "math",
  "emoji",
  "fangsong",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica neue",
  "helvetica",
  "arial",
  "menlo",
  "monaco",
  "consolas",
  "courier new",
  "sfmono-regular",
  "liberation mono",
  "apple color emoji",
  "segoe ui emoji",
  "segoe ui symbol",
  "noto color emoji",
  "inherit",
  "initial",
]);

/** Words whose capitals title case would lose. */
const FONT_WORDS: Record<string, string> = {
  dm: "DM",
  eb: "EB",
  ibm: "IBM",
  jetbrains: "JetBrains",
  pt: "PT",
  sf: "SF",
};

/**
 * `--font-geist-sans` (next/font's variable) → "Geist". Next.js apps point
 * `--font-sans` at these, and the family name is only in the variable name.
 */
export function fontFromVariable(name: string): string | null {
  const words = name
    .replace(/^-*font-/i, "")
    .split("-")
    .filter(Boolean);
  // A bare role (`--font-sans`) names no family.
  const roles = ["sans", "serif", "mono", "heading", "body", "display"];
  if (words.length <= 1 && roles.includes(words[0]?.toLowerCase() ?? "")) {
    return null;
  }
  // `-sans` names the role, not the family; `-mono` is part of the family.
  if (words.length > 1 && words.at(-1)?.toLowerCase() === "sans") words.pop();
  if (words.length === 0) return null;
  return words
    .map((word) => {
      const lower = word.toLowerCase();
      return (
        FONT_WORDS[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1)
      );
    })
    .join(" ");
}

/**
 * The family a font stack asks for first, or null when that is a generic or
 * system font (the stack then means "no web font").
 */
export function readFontFamily(
  value: string | undefined,
  lookup: Lookup,
): string | null {
  if (!value) return null;
  const first = splitList(value)[0];
  if (!first) return null;
  const variable = /^var\(\s*--([\w-]+)\s*(?:,[\s\S]*)?\)$/i.exec(first);
  if (variable?.[1]) {
    const found = lookup(variable[1]);
    if (found !== undefined && found !== value) {
      return readFontFamily(found, () => undefined);
    }
    return fontFromVariable(variable[1]);
  }
  const family = first.replace(/^["']|["']$/g, "").trim();
  if (!family || GENERIC_FONTS.has(family.toLowerCase())) return null;
  return family.slice(0, 60);
}

export type ShadowLayer = {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: Oklch | null;
};

/** The first layer of a `box-shadow` value, in px. */
export function readShadow(value: string, lookup: Lookup): ShadowLayer | null {
  const resolved = resolveVars(value, lookup);
  const layer = resolved ? splitList(resolved)[0] : undefined;
  if (!layer || /^none$/i.test(layer)) return null;
  const parts = layer.match(/[\w.#%+-]+\([^)]*\)|[^\s]+/g) ?? [];
  const lengths: number[] = [];
  const rest: string[] = [];
  for (const part of parts) {
    if (/^inset$/i.test(part)) continue;
    const px = lengths.length < 4 ? toPx(readLength(part)) : null;
    if (px !== null) lengths.push(px);
    else rest.push(part);
  }
  if (lengths.length < 2) return null;
  const [x = 0, y = 0, blur = 0, spread = 0] = lengths;
  const color = rest.length > 0 ? readColor(rest.join(" "), lookup) : null;
  return { x, y, blur, spread, color };
}
