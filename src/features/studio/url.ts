// What the Studio keeps in its URL.
//   t: the theme, as a share-link value (core/codec). Only the diff from the
//      defaults, so the default theme has no `t` at all.
//   p: the preview page.
// Both use history "replace": the address bar always shows a shareable link,
// but editing never floods the back button.

import { createParser, parseAsStringLiteral, throttle } from "nuqs";
import { decodeTheme } from "@/core/codec/decode";
import { encodeTheme } from "@/core/codec/encode";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import type { Theme } from "@/core/theme/schema";
import {
  PREVIEW_PAGES,
  type PreviewPageId,
} from "@/features/preview/pages/list";

/** Links above this still work, but some chat apps and tools truncate them. */
export const LONG_LINK_CHARS = 4096;

export const themeParser = createParser<Theme>({
  // Never throws: a broken or foreign link reads as "no theme".
  parse: (value) => decodeTheme(value),
  serialize: encodeTheme,
  eq: (a, b) => a === b || encodeTheme(a) === encodeTheme(b),
})
  .withDefault(DEFAULT_THEME)
  .withOptions({
    history: "replace",
    shallow: true,
    clearOnDefault: true,
    // Dragging a slider changes the theme every frame; browsers rate-limit
    // history.replaceState, so the URL follows at most every 300ms.
    limitUrlUpdates: throttle(300),
  });

export const pageParser = parseAsStringLiteral(
  PREVIEW_PAGES.map((page) => page.id),
)
  .withDefault(PREVIEW_PAGES[0].id)
  .withOptions({ history: "replace", shallow: true, clearOnDefault: true });

const DEFAULT_T = encodeTheme(DEFAULT_THEME);

/**
 * The full share link on this origin. Mirrors what `clearOnDefault` puts in
 * the address bar: the default theme and the first page need no parameter.
 */
export function shareUrl(
  origin: string,
  theme: Theme,
  page: PreviewPageId = PREVIEW_PAGES[0].id,
): string {
  const url = new URL("/studio", origin);
  const t = encodeTheme(theme);
  if (t !== DEFAULT_T) url.searchParams.set("t", t);
  if (page !== PREVIEW_PAGES[0].id) url.searchParams.set("p", page);
  return url.toString();
}
