// Every stored or shared theme carries `v`. Old versions are upgraded one step
// at a time here, then parsed with the current schema, so old links never
// break. Never reuse a version number, and add a golden URL fixture for each.

import { THEME_VERSION } from "./schema";

type Raw = Record<string, unknown>;

/** `migrations[n]` upgrades a version-n payload to version n + 1. */
const migrations: Record<number, (theme: Raw) => Raw> = {};

const isObject = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Bring any payload up to the current version. Input without `v` is treated
 * as current (hand-written JSON, API calls). Anything newer than this build,
 * or not an object, is returned as-is and fails the schema.
 */
export function migrate(raw: unknown): unknown {
  if (!isObject(raw)) return raw;
  let theme: Raw = "v" in raw ? raw : { ...raw, v: THEME_VERSION };
  while (typeof theme.v === "number" && theme.v < THEME_VERSION) {
    const step = migrations[theme.v];
    if (!step) break;
    theme = step(theme);
  }
  return theme;
}
