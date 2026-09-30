/**
 * What every importer reads its source into: custom-property values by
 * mode, keyed without the leading `--` (`primary`, `font-sans`). Values are
 * still the source's own strings; `infer.ts` interprets them.
 */
export type RawTheme = {
  light: Record<string, string>;
  dark: Record<string, string>;
  /** `@theme` / `cssVars.theme`: mode-independent values. */
  theme: Record<string, string>;
  /** Declarations skipped because they belong to no theme (other rules). */
  ignored: number;
  /** A name the source gives the theme, if any. */
  name?: string;
};

export const emptyRawTheme = (): RawTheme => ({
  light: {},
  dark: {},
  theme: {},
  ignored: 0,
});
