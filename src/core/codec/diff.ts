// A theme as a flat map of dotted paths, and the difference from defaults.
// Only what differs from DEFAULT_THEME goes into a link.

import { DEFAULT_THEME } from "../theme/defaults";
import type { Theme } from "../theme/schema";

export type Flat = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Leaves are primitives and arrays (colour tuples, the chart list). */
export function flatten(value: unknown, prefix = "", out: Flat = {}): Flat {
  if (!isPlainObject(value)) {
    if (prefix && value !== undefined) out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

export function unflatten(flat: Flat): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(".");
    let node = root;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) {
        node[key] = value;
        return;
      }
      const next = node[key];
      if (!isPlainObject(next)) node[key] = {};
      node = node[key] as Record<string, unknown>;
    });
  }
  return root;
}

const DEFAULTS = flatten(DEFAULT_THEME);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The fields of `theme` that differ from the defaults. `v` is always kept. */
export function diffFromDefaults(theme: Theme): Flat {
  const flat = flatten(theme);
  const out: Flat = { v: theme.v };
  for (const [path, value] of Object.entries(flat)) {
    if (path !== "v" && !same(value, DEFAULTS[path])) out[path] = value;
  }
  return out;
}
