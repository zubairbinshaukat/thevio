// Google Fonts for the preview, loaded at runtime through the CSS2 API.
// Pure helpers first (tested in node), then the DOM loader.
//
// The @font-face rules this adds are global, which is harmless: only a
// ThemeScope names these families (via --font-sans etc.), and the chrome uses
// next/font's own hashed family names.

import { FONTS, type FontEntry } from "@/config/fonts";

const CSS2 = "https://fonts.googleapis.com/css2";

/** Google family names are letters, digits and spaces ("Source Sans 3"). */
const FAMILY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ]{0,58}[A-Za-z0-9]$|^[A-Za-z]$/;

/** A family name safe to put in a URL, or null. Collapses inner spaces. */
export function cleanFamily(input: string): string | null {
  const family = input.trim().replace(/\s+/g, " ");
  return FAMILY_PATTERN.test(family) ? family : null;
}

const BY_FAMILY = new Map(
  FONTS.map((font) => [font.family.toLowerCase(), font]),
);

export function findFont(family: string): FontEntry | undefined {
  return BY_FAMILY.get(family.trim().toLowerCase());
}

const param = (family: string) =>
  encodeURIComponent(family).replace(/%20/g, "+");

/**
 * The stylesheet URL for one family. With `weights`, the axis spec from the
 * font list (unknown families get none, i.e. regular 400 only).
 */
export function fontCssUrl(family: string, weights?: string): string {
  const axis = weights ? `:wght@${weights}` : "";
  return `${CSS2}?family=${param(family)}${axis}&display=swap`;
}

/**
 * One stylesheet for picker previews: every family, subset to just the
 * glyphs of the names (`text=`), so each file is tiny.
 */
export function previewCssUrl(families: readonly string[]): string {
  const glyphs = [...new Set(families.join("").replace(/\s/g, ""))]
    .sort()
    .join("");
  const list = families.map((family) => `family=${param(family)}`).join("&");
  return `${CSS2}?${list}&text=${encodeURIComponent(glyphs)}&display=block`;
}

/** Prefix used to keep preview subsets apart from the real families. */
export const PREVIEW_PREFIX = "tvp ";

/**
 * Renames every family in a Google Fonts stylesheet. A subset under the real
 * name would shadow the full font (same family, weight and style), and text
 * using it would lose every glyph outside the subset.
 */
export function renameFamilies(css: string, prefix = PREVIEW_PREFIX): string {
  return css.replace(
    /font-family:\s*(['"])([^'"]+)\1/g,
    (_, quote: string, family: string) =>
      `font-family: ${quote}${prefix}${family}${quote}`,
  );
}

// ---------------------------------------------------------------------------
// DOM

export type FontStatus = "loading" | "ready" | "error";

const status = new Map<string, FontStatus>();
const listeners = new Set<() => void>();

function setStatus(family: string, next: FontStatus) {
  status.set(family, next);
  for (const listener of listeners) listener();
}

export function fontStatus(family: string): FontStatus | undefined {
  return status.get(family);
}

export function subscribeFonts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function appendStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.tvFont = "";
    link.onload = () => resolve();
    link.onerror = () => {
      link.remove();
      reject(new Error(`Failed to load ${href}`));
    };
    document.head.append(link);
  });
}

/**
 * Load a family into the document once. Tries the list's weights, then the
 * bare family (regular only), then gives up and reports "error", in which
 * case the preview keeps its fallback stack.
 */
export function ensureFont(input: string): void {
  const family = cleanFamily(input);
  if (!family || status.has(family)) return;
  setStatus(family, "loading");
  const weights = findFont(family)?.weights;

  const attempt = weights
    ? appendStylesheet(fontCssUrl(family, weights)).catch(() =>
        appendStylesheet(fontCssUrl(family)),
      )
    : appendStylesheet(fontCssUrl(family));

  attempt
    // The stylesheet only declares faces; this fetches the regular one.
    .then(() => document.fonts.load(`400 1em "${family}"`))
    .then((faces) => setStatus(family, faces.length > 0 ? "ready" : "error"))
    .catch(() => setStatus(family, "error"));
}

let previews: Promise<void> | null = null;

/**
 * Picker previews: fetched once, renamed, and injected as a <style>. Only the
 * faces an element actually uses are downloaded, so the list stays cheap.
 * Resolves either way; a failed fetch just leaves names in the chrome font.
 */
export function ensurePreviewFonts(): Promise<void> {
  previews ??= fetch(previewCssUrl(FONTS.map((font) => font.family)))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((css) => {
      const style = document.createElement("style");
      style.dataset.tvFontPreviews = "";
      style.textContent = renameFamilies(css);
      document.head.append(style);
    })
    .catch(() => {});
  return previews;
}
