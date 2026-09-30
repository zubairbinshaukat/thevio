// Google Fonts for OG images. Satori reads TTF/OTF/WOFF but not WOFF2, and
// Google's CSS2 API serves TrueType to clients that aren't browsers. `text=`
// subsets the file to the glyphs drawn, so each font is a few KB.

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700;
  style: "normal";
};

const TIMEOUT_MS = 2500;

/** The first TrueType/OpenType URL in a CSS2 API response. */
export function fontUrlFromCss(css: string): string | null {
  const match =
    /src:\s*url\(([^)]+)\)\s*format\(['"](?:truetype|opentype)['"]\)/.exec(css);
  return match?.[1]?.replace(/^['"]|['"]$/g, "") ?? null;
}

/** A subset of one Google font, or null (unknown family, offline, slow). */
export async function loadGoogleFont(
  family: string,
  weight: OgFont["weight"],
  text: string,
): Promise<OgFont | null> {
  try {
    const params = new URLSearchParams({
      family: `${family}:wght@${weight}`,
      text,
    });
    const css = await fetch(`https://fonts.googleapis.com/css2?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!css.ok) return null;
    const url = fontUrlFromCss(await css.text());
    if (!url) return null;
    const file = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!file.ok) return null;
    return {
      name: family,
      data: await file.arrayBuffer(),
      weight,
      style: "normal",
    };
  } catch {
    return null;
  }
}
