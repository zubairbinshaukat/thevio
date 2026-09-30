// /api/theme: the engine over HTTP.
//
// GET  ?t=<code>[&format=<id>][&fix=false]
//      A share code → the theme with contrast fixed, links, and every fix
//      made. With `format`, the export itself (e.g. `format=css`).
// POST any theme source (Thevio JSON, tweakcn JSON, a shadcn registry item,
//      pasted globals.css) → the same, plus what the importer did.
//
// Both answer with the fixed theme's own share code, so a client can go
// from messy input to a link, an install command or a file in one call.

import { decodeTheme } from "../codec/decode";
import { encodeTheme } from "../codec/encode";
import { EXPORT_FORMATS } from "../export/formats";
import { importTheme } from "../import/import";
import type { Theme } from "../theme/schema";
import { type ValidateResult, validateAndFix } from "../theme/validate-and-fix";
import { type ApiResult, IMMUTABLE, json, NO_STORE, problem } from "./http";

/** Plan §F: request bodies are capped at 32 KB (a full globals.css is ~5 KB). */
export const MAX_BODY_BYTES = 32 * 1024;

const FORMAT_IDS = EXPORT_FORMATS.map((format) => format.id);

type Fixed = Extract<ValidateResult, { ok: true }>;

/** The links and commands a client needs, all derived from the share code. */
export function themeLinks(theme: Theme, origin: string) {
  const t = encodeTheme(theme);
  const registryUrl = `${origin}/r/t/${t}.json`;
  return {
    t,
    url: `${origin}/studio?t=${t}`,
    registryUrl,
    install: `npx shadcn@latest add ${registryUrl}`,
    og: `${origin}/api/og?t=${t}`,
    exports: Object.fromEntries(
      FORMAT_IDS.map((id) => [id, `${origin}/api/theme?t=${t}&format=${id}`]),
    ),
  };
}

function payload(result: Fixed, origin: string) {
  return {
    theme: result.theme,
    ...themeLinks(result.theme, origin),
    fixes: result.fixes,
    unfixable: result.unfixable,
  };
}

const wantsFix = (params: URLSearchParams) =>
  !/^(?:false|0|no)$/i.test(params.get("fix") ?? "");

/** One export as the response: a file itself, or a list for multi-file formats. */
function exportResponse(result: Fixed, id: string): ApiResult {
  const format = EXPORT_FORMATS.find((entry) => entry.id === id);
  if (!format) {
    return problem(400, `Unknown format "${id}".`, { formats: FORMAT_IDS });
  }
  const files = format.files(result.resolved);
  const [only] = files;
  if (files.length === 1 && only) {
    return {
      status: 200,
      headers: {
        "Content-Type": `${only.type}; charset=utf-8`,
        "Content-Disposition": `inline; filename="${only.path.split("/").at(-1)}"`,
        "Access-Control-Allow-Origin": "*",
        ...IMMUTABLE,
      },
      body: only.contents,
    };
  }
  return json(200, { format: id, files }, IMMUTABLE);
}

export function getTheme(params: URLSearchParams, origin: string): ApiResult {
  const t = params.get("t");
  if (!t) {
    return problem(
      400,
      "Pass a share code as ?t= (the `t` of a Thevio link), or POST a theme.",
    );
  }
  const theme = decodeTheme(t);
  if (!theme) {
    return problem(422, "`t` is not a Thevio theme code.");
  }
  const result = validateAndFix(theme, { contrast: wantsFix(params) });
  if (!result.ok) return problem(422, result.error);

  const format = params.get("format");
  if (format) return exportResponse(result, format);
  return json(200, payload(result, origin), IMMUTABLE);
}

const TEXT_TYPES = new Set(["text/css", "text/plain", "text/markdown"]);

/** Pull the theme source out of a body: JSON may wrap CSS as { css } or { source }. */
function sourceOf(
  mediaType: string,
  text: string,
): { source: string } | ApiResult {
  if (mediaType !== "application/json") return { source: text };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return problem(
      400,
      `The body isn't valid JSON: ${(error as Error).message}`,
    );
  }
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const key of ["css", "source"] as const) {
      const value = (data as Record<string, unknown>)[key];
      if (typeof value === "string" && Object.keys(data).length === 1) {
        return { source: value };
      }
    }
  }
  return { source: text };
}

export function postTheme(
  contentType: string | null,
  text: string,
  params: URLSearchParams,
  origin: string,
): ApiResult {
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return problem(413, `Bodies are limited to ${MAX_BODY_BYTES / 1024} KB.`);
  }
  const mediaType =
    (contentType ?? "text/plain").split(";")[0]?.trim().toLowerCase() ?? "";
  if (mediaType !== "application/json" && !TEXT_TYPES.has(mediaType)) {
    return problem(
      415,
      "Send application/json (a theme, tweakcn or shadcn registry JSON, or { css }) or text/css.",
    );
  }
  const body = sourceOf(mediaType, text);
  if ("status" in body) return body;

  const imported = importTheme(body.source);
  if (!imported.ok) return problem(422, imported.error);

  // Thevio JSON goes to the fixer as sent, so `fixes` lists the schema
  // repairs (clamped, dropped…) too, not only contrast.
  const input =
    imported.format === "thevio-json"
      ? JSON.parse(body.source)
      : imported.theme;
  const result = validateAndFix(input, { contrast: wantsFix(params) });
  if (!result.ok) return problem(422, result.error);
  return json(
    200,
    {
      ...payload(result, origin),
      import: {
        format: imported.format,
        pinned: imported.pinned,
        notes: imported.notes,
      },
    },
    NO_STORE,
  );
}
