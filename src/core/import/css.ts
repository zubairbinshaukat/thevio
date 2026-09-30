// Pasted CSS → the custom properties a theme defines, sorted into light, dark
// and `@theme`. A small scanner, not a full CSS parser: it only needs rules,
// at-rules and `--name: value` declarations, and it must run in the browser
// without PostCSS. Comments, strings and parentheses are respected, so values
// such as `url(data:…;…)` or `"a;b"` don't split.

import { emptyRawTheme, type RawTheme } from "./raw";

type Declaration = {
  /** Enclosing preludes, outermost first (`@layer base`, `:root`). */
  readonly chain: readonly string[];
  readonly name: string;
  readonly value: string;
};

/** Every custom-property declaration, with the rules around it. */
export function scanCustomProperties(css: string): Declaration[] {
  const out: Declaration[] = [];
  const stack: string[] = [];
  let buffer = "";
  let parens = 0;
  let quote: string | null = null;

  const flush = () => {
    const text = buffer.trim();
    buffer = "";
    if (stack.length === 0 || !text.startsWith("--")) return;
    const colon = text.indexOf(":");
    if (colon < 0) return;
    const name = text.slice(2, colon).trim();
    const value = text
      .slice(colon + 1)
      .replace(/!important\s*$/i, "")
      .trim();
    if (name) out.push({ chain: [...stack], name, value });
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      buffer += ch;
      if (ch === "\\") buffer += css[++i] ?? "";
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 1;
      continue;
    }
    // Not CSS, but shadcn's own Tailwind v4 guide has `// <-- Wrap in hsl`
    // after declarations, and people paste it. URLs are inside url(…).
    if (ch === "/" && css[i + 1] === "/" && parens === 0) {
      flush();
      const end = css.indexOf("\n", i);
      i = end < 0 ? css.length : end;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buffer += ch;
    } else if (ch === "(") {
      parens++;
      buffer += ch;
    } else if (ch === ")") {
      parens = Math.max(0, parens - 1);
      buffer += ch;
    } else if (parens > 0) {
      buffer += ch;
    } else if (ch === "{") {
      stack.push(buffer.trim().replace(/\s+/g, " "));
      buffer = "";
    } else if (ch === "}") {
      flush();
      stack.pop();
    } else if (ch === ";") {
      flush();
    } else {
      buffer += ch;
    }
  }
  return out;
}

type Target = "light" | "dark" | "theme" | null;

const DARK_SELECTOR =
  /\.dark\b|\.theme-dark\b|\[data-(?:theme|mode|color-scheme|color-mode|bs-theme)\s*=\s*["']?dark["']?\s*\]/i;
const LIGHT_SELECTOR =
  /(?:^|[\s,>+~(])(?::root|html|:host|body)\b|\.light\b|\[data-(?:theme|mode|color-scheme|color-mode|bs-theme)\s*=\s*["']?light["']?\s*\]/i;

/** Which part of a theme a declaration with these enclosing rules sets. */
function classify(chain: readonly string[]): Target {
  let target: Target = null;
  let media: "light" | "dark" | null = null;
  for (const prelude of chain) {
    if (prelude.startsWith("@")) {
      if (/^@theme\b/i.test(prelude)) return "theme";
      if (/^@media\b/i.test(prelude)) {
        const scheme = /prefers-color-scheme\s*:\s*(dark|light)/i.exec(prelude);
        if (!scheme) return null; // breakpoints, print: not theme values
        media = scheme[1]?.toLowerCase() === "dark" ? "dark" : "light";
      }
      // @layer, @supports, @scope… don't change what a rule means.
      continue;
    }
    // `:root:not(.dark)` is light: drop negations before looking for `.dark`.
    const selector = prelude.replace(/:not\([^)]*\)/gi, "");
    if (DARK_SELECTOR.test(selector)) target = "dark";
    else if (LIGHT_SELECTOR.test(selector) || selector.startsWith("&")) {
      target ??= "light";
    } else return null; // `.theme-ocean`, `.card`: some other rule
  }
  return media === "dark" && target === "light" ? "dark" : target;
}

/** Split `light-dark(a, b)` at its top-level comma. */
function splitLightDark(value: string): [string, string] | null {
  const match = /^light-dark\(([\s\S]*)\)$/i.exec(value.trim());
  const inner = match?.[1];
  if (!inner) return null;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
    }
  }
  return null;
}

/** Custom properties by mode. Later declarations win, as in the cascade. */
export function readCssTheme(css: string): RawTheme {
  const raw = emptyRawTheme();
  for (const { chain, name, value } of scanCustomProperties(css)) {
    const target = classify(chain);
    if (!target) {
      raw.ignored++;
      continue;
    }
    const pair = target === "theme" ? null : splitLightDark(value);
    if (pair && target === "light") {
      raw.light[name] = pair[0];
      raw.dark[name] = pair[1];
    } else if (pair) {
      raw.dark[name] = pair[1];
    } else {
      raw[target][name] = value;
    }
  }
  return raw;
}
