// Pasted JSON → RawTheme. Reads every theme JSON shape in circulation:
// - shadcn registry items (`cssVars.theme/light/dark`): tweakcn's
//   `/r/themes/<id>.json`, other theme registries, Thevio's own `/r/*`;
// - tweakcn presets (`{ label, styles: { light, dark } }`), its API rows
//   (`{ data: { name, styles } }`) and bare `{ light, dark }` style maps.
// A Thevio theme (`{ v, colors, … }`) is recognised but not read here: it
// is already the right shape.

import { emptyRawTheme, type RawTheme } from "./raw";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A `{ name: value }` map with `--` stripped and values as strings. */
function varMap(value: unknown): Record<string, string> {
  if (!isObject(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number") {
      out[key.replace(/^--/, "")] = String(entry);
    }
  }
  return out;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** A registry slug (`modern-minimal`) as a title (`Modern Minimal`). */
const titleCase = (slug: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? slug.replace(
        /(^|-)([a-z0-9])/g,
        (_, dash: string, ch: string) =>
          `${dash ? " " : ""}${ch.toUpperCase()}`,
      )
    : slug;

export type JsonSource =
  | { readonly kind: "thevio"; readonly input: Json }
  | {
      readonly kind: "shadcn-registry" | "tweakcn";
      readonly raw: RawTheme;
    };

export function readJsonTheme(data: unknown): JsonSource | null {
  if (!isObject(data)) return null;

  if (typeof data.v === "number" || isObject(data.colors)) {
    return { kind: "thevio", input: data };
  }

  if (isObject(data.cssVars)) {
    const raw = emptyRawTheme();
    raw.theme = varMap(data.cssVars.theme);
    raw.light = varMap(data.cssVars.light);
    raw.dark = varMap(data.cssVars.dark);
    const name = text(data.title) ?? text(data.name);
    if (name) raw.name = titleCase(name);
    return { kind: "shadcn-registry", raw };
  }

  const row = isObject(data.data) ? data.data : data;
  const styles = isObject(row.styles)
    ? row.styles
    : isObject(row.themeStyles)
      ? row.themeStyles
      : isObject(row.light) || isObject(row.dark)
        ? row
        : null;
  if (styles) {
    const raw = emptyRawTheme();
    raw.light = varMap(styles.light);
    raw.dark = varMap(styles.dark);
    const name = text(row.label) ?? text(row.name);
    if (name) raw.name = titleCase(name);
    return { kind: "tweakcn", raw };
  }
  return null;
}
