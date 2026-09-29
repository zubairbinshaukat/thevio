// Theme → the `t` value of a share link.
//
// Format: a 1-character codec prefix, then the payload. The prefix lets the
// format change later without breaking old links (decisions §3).
//   "1": lz-string (URI-safe) of JSON { shortKey: value } holding only the
//        fields that differ from the defaults, plus `v`.

import { compressToEncodedURIComponent } from "lz-string";
import type { Theme } from "../theme/schema";
import { diffFromDefaults } from "./diff";
import { ENUM_FIELDS, type FieldPath, keyForPath } from "./keys";

export const CODEC_LZ_JSON = "1";

// Links carry 4 decimals: far finer than any control or visible difference.
const round = (value: number) => Math.round(value * 1e4) / 1e4;

function pack(path: string, value: unknown): unknown {
  const values = ENUM_FIELDS[path as FieldPath];
  if (values) return values.indexOf(value as string);
  return typeof value === "number" ? round(value) : value;
}

export function encodeTheme(theme: Theme): string {
  const payload: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(diffFromDefaults(theme))) {
    const key = keyForPath(path);
    // A field without a key would silently vanish from links: fail loudly.
    if (!key) throw new Error(`No share-link key for "${path}"`);
    payload[key] = pack(path, value);
  }
  return CODEC_LZ_JSON + compressToEncodedURIComponent(JSON.stringify(payload));
}
