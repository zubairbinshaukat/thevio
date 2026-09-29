// Short keys for share links. Every theme field has a fixed 1–2 character key,
// and enum values travel as their index. NEVER change or reuse a key or an
// enum order: old links decode with this table. Add new keys only.

import {
  BUTTON_SHAPES,
  BUTTON_STYLES,
  CHART_STYLES,
  DENSITIES,
  FOCUS_RINGS,
  INPUT_STYLES,
  RING_SOURCES,
  SURFACE_STYLES,
  TAB_STYLES,
} from "../theme/schema";
import { COLOR_TOKENS, type ColorToken } from "../theme/tokens";

/** Dotted theme path → short key. */
export const FIELD_KEYS = {
  v: "v",
  name: "n",
  "colors.brand": "b",
  "colors.neutral.hue": "nh",
  "colors.neutral.chroma": "nc",
  "colors.secondary": "s",
  "colors.semantic.danger": "sd",
  "colors.semantic.success": "ss",
  "colors.semantic.warning": "sw",
  "colors.semantic.info": "si",
  "colors.chart": "ch",
  "colors.chartStyle": "cs",
  "fonts.sans": "fs",
  "fonts.mono": "fm",
  "fonts.heading": "fh",
  radius: "r",
  letterSpacing: "ls",
  spacing: "sp",
  "shadow.x": "hx",
  "shadow.y": "hy",
  "shadow.blur": "hb",
  "shadow.spread": "hs",
  "shadow.opacity": "ho",
  "shadow.color": "hc",
  "border.width": "bw",
  "states.hoverShift": "th",
  "states.focusRing": "tf",
  "components.surfaceStyle": "ks",
  "components.density": "kd",
  "components.buttonShape": "kb",
  "components.buttonStyle": "ky",
  "components.inputStyle": "ki",
  "components.focusRing": "kf",
  "components.tabStyle": "kt",
} as const;

export type FieldPath = keyof typeof FIELD_KEYS;

/** Fields stored as an index into these lists. */
export const ENUM_FIELDS: Partial<Record<FieldPath, readonly string[]>> = {
  "colors.chartStyle": CHART_STYLES,
  "states.focusRing": RING_SOURCES,
  "components.surfaceStyle": SURFACE_STYLES,
  "components.density": DENSITIES,
  "components.buttonShape": BUTTON_SHAPES,
  "components.buttonStyle": BUTTON_STYLES,
  "components.inputStyle": INPUT_STYLES,
  "components.focusRing": FOCUS_RINGS,
  "components.tabStyle": TAB_STYLES,
};

const PATH_BY_KEY = new Map<string, FieldPath>(
  Object.entries(FIELD_KEYS).map(([path, key]) => [key, path as FieldPath]),
);

/**
 * Overrides: `L` (light) or `D` (dark) + the token's index in COLOR_TOKENS,
 * in base 36. `overrides.dark.primary` → `D6`.
 */
const MODE_KEYS = { light: "L", dark: "D" } as const;

export function keyForPath(path: string): string | null {
  if (path in FIELD_KEYS) return FIELD_KEYS[path as FieldPath];
  const match = /^overrides\.(light|dark)\.(.+)$/.exec(path);
  if (!match) return null;
  const [, mode, token] = match as unknown as [
    string,
    "light" | "dark",
    string,
  ];
  const index = COLOR_TOKENS.indexOf(token as ColorToken);
  return index < 0 ? null : `${MODE_KEYS[mode]}${index.toString(36)}`;
}

export function pathForKey(key: string): string | null {
  const field = PATH_BY_KEY.get(key);
  if (field) return field;
  const mode = key[0] === "L" ? "light" : key[0] === "D" ? "dark" : null;
  if (!mode || key.length < 2) return null;
  const index = Number.parseInt(key.slice(1), 36);
  const token = COLOR_TOKENS[index];
  return token && index.toString(36) === key.slice(1)
    ? `overrides.${mode}.${token}`
    : null;
}
