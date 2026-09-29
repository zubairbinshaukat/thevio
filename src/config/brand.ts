// Thevio's mark: a T over a V. Redrawn from branding/logo-source.png
// (99% pixel overlap), symmetric about x = 293.5. Every icon, the Logo
// component and the OG image are drawn from these paths; regenerate the
// raster icons with `pnpm icons` after changing them.

export const MARK = {
  width: 587,
  height: 529,
  paths: [
    // The T: bar with rounded top corners, chamfered underside and V-notch.
    "M13 0H574A13 13 0 0 1 587 13V85L566 106H378L293.5 241L209 106H21L0 85V13A13 13 0 0 1 13 0Z",
    // Left leg of the V.
    "M65 156H86.5L268 404.6V529L65 353Z",
    // Right leg of the V.
    "M522 156H500.5L319 404.6V529L522 353Z",
  ],
} as const;

/** The mark is black on light schemes and white on dark ones. */
export const BRAND_COLORS = {
  /** Mark on light backgrounds; the site's light foreground (neutral 950). */
  ink: "#0a0a0a",
  /** Mark on dark backgrounds; the site's dark foreground (neutral 50). */
  paper: "#fafafa",
  /** Light page background. */
  light: "#ffffff",
  /** Dark page background (neutral 950). */
  dark: "#0a0a0a",
} as const;
