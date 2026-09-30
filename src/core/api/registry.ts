// /r/…: shadcn registry items, so `npx shadcn add <url>` installs a theme.
//
// A share code installs exactly what its link shows: no contrast fixes are
// applied behind the user's back (the Studio and /api/theme offer them).

import { decodeTheme } from "../codec/decode";
import { toRegistryItem } from "../export/shadcn-registry";
import { resolveTheme } from "../theme/resolve";
import type { Theme } from "../theme/schema";
import { type ApiResult, IMMUTABLE, json, problem } from "./http";

/** `1abc.json` → `1abc`. Registry URLs end in .json by convention. */
export const stripJson = (segment: string) =>
  decodeURIComponent(segment).replace(/\.json$/i, "");

export function registryItem(theme: Theme, name?: string): ApiResult {
  return json(200, toRegistryItem(resolveTheme(theme), name), IMMUTABLE);
}

export function registryForCode(segment: string): ApiResult {
  const theme = decodeTheme(stripJson(segment));
  if (!theme) {
    return problem(404, "No theme here: the code in this URL doesn't decode.");
  }
  return registryItem(theme);
}
