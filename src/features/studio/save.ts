// Saving exports in the browser: one file, a ZIP of everything, a PNG of the
// preview. fflate and SnapDOM are imported inside the functions, never at the
// top: `perf:budget` fails if either reaches the Studio's initial JS.

import type { ExportFile } from "@/core/export/format";

/** Hand a file to the browser's download. */
export function saveFile(name: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const fileName = (path: string) => path.split("/").at(-1) ?? path;

/** Warm the chunks on hover, so the click itself is instant. */
export function prefetchSavers(): void {
  void import("fflate");
  void import("@zumer/snapdom");
}

/**
 * The preview as a PNG. Fonts the preview uses (the theme's Google Fonts)
 * are embedded, so the image shows them, not a fallback.
 */
export async function capturePng(element: HTMLElement): Promise<Blob> {
  const { snapdom } = await import("@zumer/snapdom");
  await document.fonts.ready;
  const result = await snapdom(element, { embedFonts: true, dpr: 2 });
  return result.toBlob({ type: "png" });
}

/** Every export, plus any extra binary files, as one ZIP. */
export async function zipFiles(
  files: readonly ExportFile[],
  extra: Record<string, Uint8Array> = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const { strToU8, zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[file.path] = strToU8(file.contents);
  // A copy on a plain ArrayBuffer, which Blob accepts (fflate's may be shared).
  return new Uint8Array(zipSync({ ...entries, ...extra }, { level: 6 }));
}
