// Anything pasted → a Thevio theme. One entry point for the Studio's
// "Paste theme" dialog and POST /api/theme.
//
// Accepts shadcn/tweakcn `globals.css` (any era), tweakcn and shadcn-registry
// JSON, Thevio theme JSON, a Thevio share link, and any Thevio export: every
// export embeds its share link, so pasting one back restores the theme
// exactly, component style included. If the file was edited after export,
// the link's theme is the base and the edited colours are pinned on top.
//
// The result is not contrast-fixed: run it through validateAndFix to show
// and apply the fixes (plan §G).

import { decodeTheme } from "../codec/decode";
import type { Theme } from "../theme/schema";
import { validateAndFix } from "../theme/validate-and-fix";
import { readCssTheme } from "./css";
import { type ImportNote, inferTheme } from "./infer";
import { readJsonTheme } from "./json";
import type { RawTheme } from "./raw";

export type { ImportNote } from "./infer";

export type ImportFormat =
  | "thevio-link"
  | "thevio-json"
  | "css"
  | "tweakcn"
  | "shadcn-registry";

export type ImportResult =
  | {
      readonly ok: true;
      readonly format: ImportFormat;
      readonly theme: Theme;
      readonly notes: readonly ImportNote[];
      /** Colours taken from the source and pinned exactly. */
      readonly pinned: number;
    }
  | { readonly ok: false; readonly error: string };

/** Far above any theme (a full globals.css is ~5 KB); bounds parsing work. */
export const MAX_IMPORT_LENGTH = 256 * 1024;

/** `…/studio?t=<code>` anywhere in the text; the code is lz-string URI-safe. */
const LINK = /[?&]t=([0-9][A-Za-z0-9+\-$%]{1,8192})/;
/** A share code pasted on its own. */
const BARE_CODE = /^[0-9][A-Za-z0-9+\-$]{4,8192}$/;

function findLinkedTheme(source: string): Theme | null {
  const trimmed = source.trim();
  const code =
    LINK.exec(trimmed)?.[1] ?? (BARE_CODE.test(trimmed) ? trimmed : null);
  if (!code) return null;
  try {
    return decodeTheme(code.includes("%") ? decodeURIComponent(code) : code);
  } catch {
    return null;
  }
}

const hasValues = (raw: RawTheme) =>
  Object.keys(raw.light).length +
    Object.keys(raw.dark).length +
    Object.keys(raw.theme).length >
  0;

const NOTHING_FOUND =
  "No theme found. Paste a globals.css (with :root and .dark), a tweakcn or shadcn registry theme JSON, or a Thevio link.";

export function importTheme(source: string): ImportResult {
  if (source.length > MAX_IMPORT_LENGTH) {
    return { ok: false, error: "That's too long to be a theme (256 KB max)." };
  }
  if (!source.trim()) return { ok: false, error: NOTHING_FOUND };

  const linked = findLinkedTheme(source);
  const trimmed = source.trim();

  let raw: RawTheme | null = null;
  let format: ImportFormat = "css";
  if (/^[{[]/.test(trimmed)) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (error) {
      return {
        ok: false,
        error: `That looks like JSON but doesn't parse: ${(error as Error).message}`,
      };
    }
    const json = readJsonTheme(data);
    if (json?.kind === "thevio") {
      const result = validateAndFix(json.input, { contrast: false });
      if (!result.ok) return { ok: false, error: result.error };
      return {
        ok: true,
        format: "thevio-json",
        theme: result.theme,
        pinned: 0,
        notes: result.fixes.flatMap((fix) =>
          fix.kind === "schema"
            ? [
                {
                  level: "warning" as const,
                  message: `${fix.path}: ${fix.message}`,
                },
              ]
            : [],
        ),
      };
    }
    if (json) {
      raw = json.raw;
      format = json.kind;
    }
  } else if (trimmed.includes("{")) {
    raw = readCssTheme(source);
  }

  if (!raw || !hasValues(raw)) {
    if (linked) {
      return {
        ok: true,
        format: "thevio-link",
        theme: linked,
        pinned: 0,
        notes: [{ level: "info", message: "Restored from its Thevio link." }],
      };
    }
    return { ok: false, error: NOTHING_FOUND };
  }

  const inferred = inferTheme(raw, linked ?? undefined);
  if (!linked) {
    return { ok: true, format, ...inferred };
  }
  if (inferred.pinned === 0) {
    return {
      ok: true,
      format: "thevio-link",
      theme: inferred.theme,
      pinned: 0,
      notes: [
        {
          level: "info",
          message: "A Thevio export: restored exactly from its embedded link.",
        },
      ],
    };
  }
  return {
    ok: true,
    format,
    theme: inferred.theme,
    pinned: inferred.pinned,
    notes: [
      {
        level: "info",
        message: `A Thevio export edited since: kept its style and pinned ${inferred.pinned} changed colour${inferred.pinned === 1 ? "" : "s"}.`,
      },
      ...inferred.notes,
    ],
  };
}
