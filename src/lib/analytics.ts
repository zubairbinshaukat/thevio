/** Share links carry the whole theme in `?t=`; analytics only needs the page. */
export function stripThemeParam(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("t")) return url;
    parsed.searchParams.delete("t");
    return parsed.toString();
  } catch {
    return url;
  }
}
