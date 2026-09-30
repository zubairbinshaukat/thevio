// The Studio's font list: popular Google Fonts, curated. Any other Google
// family still works (it can be typed in the picker or arrive in a link);
// this list is only what the picker suggests.
//
// `weights` is the CSS2 API axis spec: a range for variable fonts
// ("400..700"), a list for static ones ("400;700"), or omitted when only
// 400 exists. A spec the family doesn't support makes Google answer 400; the
// loader then retries with the bare family, so a wrong entry degrades to
// regular weight instead of breaking.

export type FontCategory = "sans" | "serif" | "mono" | "display";

export type FontEntry = {
  readonly family: string;
  readonly category: FontCategory;
  readonly weights?: string;
};

const VAR = "400..700";
const STATIC = "400;500;600;700";

export const FONTS: readonly FontEntry[] = [
  // Sans
  { family: "Inter", category: "sans", weights: VAR },
  { family: "Geist", category: "sans", weights: VAR },
  { family: "DM Sans", category: "sans", weights: VAR },
  { family: "Manrope", category: "sans", weights: VAR },
  { family: "Plus Jakarta Sans", category: "sans", weights: VAR },
  { family: "Figtree", category: "sans", weights: VAR },
  { family: "Onest", category: "sans", weights: VAR },
  { family: "Outfit", category: "sans", weights: VAR },
  { family: "Hanken Grotesk", category: "sans", weights: VAR },
  { family: "Albert Sans", category: "sans", weights: VAR },
  { family: "Instrument Sans", category: "sans", weights: VAR },
  { family: "Schibsted Grotesk", category: "sans", weights: VAR },
  { family: "Bricolage Grotesque", category: "sans", weights: VAR },
  { family: "Space Grotesk", category: "sans", weights: VAR },
  { family: "Sora", category: "sans", weights: VAR },
  { family: "Urbanist", category: "sans", weights: VAR },
  { family: "Lexend", category: "sans", weights: VAR },
  { family: "Work Sans", category: "sans", weights: VAR },
  { family: "Public Sans", category: "sans", weights: VAR },
  { family: "Rubik", category: "sans", weights: VAR },
  { family: "Roboto", category: "sans", weights: VAR },
  { family: "Open Sans", category: "sans", weights: VAR },
  { family: "Noto Sans", category: "sans", weights: VAR },
  { family: "Source Sans 3", category: "sans", weights: VAR },
  { family: "Montserrat", category: "sans", weights: VAR },
  { family: "Raleway", category: "sans", weights: VAR },
  { family: "Nunito", category: "sans", weights: VAR },
  { family: "Mulish", category: "sans", weights: VAR },
  { family: "Karla", category: "sans", weights: VAR },
  { family: "Archivo", category: "sans", weights: VAR },
  { family: "Red Hat Display", category: "sans", weights: VAR },
  { family: "Poppins", category: "sans", weights: STATIC },
  { family: "IBM Plex Sans", category: "sans", weights: STATIC },
  { family: "Barlow", category: "sans", weights: STATIC },
  { family: "Lato", category: "sans", weights: "400;700" },
  // Serif
  { family: "Lora", category: "serif", weights: VAR },
  { family: "Fraunces", category: "serif", weights: VAR },
  { family: "Newsreader", category: "serif", weights: VAR },
  { family: "Source Serif 4", category: "serif", weights: VAR },
  { family: "Playfair Display", category: "serif", weights: VAR },
  { family: "EB Garamond", category: "serif", weights: VAR },
  { family: "Crimson Pro", category: "serif", weights: VAR },
  { family: "Noto Serif", category: "serif", weights: VAR },
  { family: "Cormorant Garamond", category: "serif", weights: STATIC },
  { family: "Merriweather", category: "serif", weights: "400;700" },
  { family: "Libre Baskerville", category: "serif", weights: "400;700" },
  { family: "PT Serif", category: "serif", weights: "400;700" },
  { family: "Instrument Serif", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  // Display
  { family: "Unbounded", category: "display", weights: VAR },
  { family: "Syne", category: "display", weights: VAR },
  { family: "Oswald", category: "display", weights: VAR },
  { family: "Bebas Neue", category: "display" },
  { family: "Anton", category: "display" },
  // Mono
  { family: "JetBrains Mono", category: "mono", weights: VAR },
  { family: "Geist Mono", category: "mono", weights: VAR },
  { family: "Fira Code", category: "mono", weights: VAR },
  { family: "Source Code Pro", category: "mono", weights: VAR },
  { family: "Roboto Mono", category: "mono", weights: VAR },
  { family: "Red Hat Mono", category: "mono", weights: VAR },
  { family: "Martian Mono", category: "mono", weights: VAR },
  { family: "Inconsolata", category: "mono", weights: VAR },
  { family: "IBM Plex Mono", category: "mono", weights: STATIC },
  { family: "DM Mono", category: "mono", weights: "400;500" },
  { family: "Space Mono", category: "mono", weights: "400;700" },
  { family: "Ubuntu Mono", category: "mono", weights: "400;700" },
];

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
  display: "Display",
};
