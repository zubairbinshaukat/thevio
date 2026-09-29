// The `t` value of a share link → Theme, or null if it can't be read.
// Never throws: links come from anywhere.

import { decompressFromEncodedURIComponent } from "lz-string";
import { parseTheme } from "../theme/defaults";
import type { Theme } from "../theme/schema";
import { type Flat, unflatten } from "./diff";
import { CODEC_LZ_JSON } from "./encode";
import { ENUM_FIELDS, type FieldPath, pathForKey } from "./keys";

/** Longer than any real theme (they're < 2 KB); stops decompression bombs. */
export const MAX_ENCODED_LENGTH = 8192;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readPayload(encoded: string): unknown {
  if (encoded[0] !== CODEC_LZ_JSON) return null;
  try {
    const json = decompressFromEncodedURIComponent(encoded.slice(1));
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function decodeTheme(encoded: string | null | undefined): Theme | null {
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return null;
  const payload = readPayload(encoded);
  if (!isPlainObject(payload)) return null;

  const flat: Flat = {};
  for (const [key, value] of Object.entries(payload)) {
    // Keys this build doesn't know (e.g. from a newer build) are skipped.
    const path = pathForKey(key);
    if (!path) continue;
    const values = ENUM_FIELDS[path as FieldPath];
    const unpacked =
      values && typeof value === "number"
        ? values[value]
        : values
          ? undefined
          : value;
    if (unpacked !== undefined) flat[path] = unpacked;
  }

  const result = parseTheme(unflatten(flat));
  return result.success ? result.data : null;
}
