// ResolvedTheme → a shadcn `registry:theme` item, installed with
// `npx shadcn@latest add <url>`.
//
// How the CLI merges it (shadcn 4.x, update-css-vars.ts):
// - `light` → `:root`, `dark` → `.dark`, overwriting existing values;
// - `theme` → written verbatim into `@theme inline`;
// - every colour value (oklch/hex/hsl/rgb) gets `--color-X: var(--X)`, and
//   `radius` gets the ×0.6…×2.6 scale.
// Tokens only (decision A4): component styles can't travel this way; the
// `docs` field says so, and says how to load the fonts.

import { formatOklch } from "../color/convert";
import type { Mode, ResolvedTheme } from "../theme/resolve";
import { COLOR_TOKENS } from "../theme/tokens";
import {
  type ExportFile,
  fontStack,
  jsonFile,
  kebab,
  SITE,
  slug,
  studioLink,
} from "./format";

export const REGISTRY_ITEM_SCHEMA =
  "https://ui.shadcn.com/schema/registry-item.json";

/** The note the export UI must show next to the install command (A4). */
export const REGISTRY_NOTE =
  "Installs colors, radius, fonts, shadows. Component styles are not included.";

const googleFontsUrl = (families: readonly string[]) =>
  `https://fonts.google.com/share?selection.family=${families
    .map((family) => encodeURIComponent(family))
    .join("%7C")}`;

function docs(resolved: ResolvedTheme): string {
  const { sans, mono, heading } = resolved.fonts;
  const families = [...new Set([sans, heading, mono])];
  return [
    `Thevio theme "${resolved.theme.name}" installed: colors, radius, fonts and shadows. Component styles are not included.`,
    "",
    `Fonts: ${families.join(", ")}. Load them (next/font/google, or ${googleFontsUrl(families)}); until then the system fallbacks apply.`,
    `Component style, dark mode rules and AI instructions: export DESIGN.md from ${studioLink(resolved)}`,
  ].join("\n");
}

export type RegistryItem = {
  $schema: string;
  name: string;
  type: "registry:theme";
  title: string;
  description: string;
  docs: string;
  categories: string[];
  cssVars: {
    theme: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  meta: Record<string, string>;
};

export function toRegistryItem(
  resolved: ResolvedTheme,
  /** The item name; defaults to the theme name as a slug. */
  name = slug(resolved.theme.name),
): RegistryItem {
  const { fonts } = resolved;
  const theme: Record<string, string> = {
    "font-sans": fontStack(fonts.sans, "sans"),
    "font-mono": fontStack(fonts.mono, "mono"),
    "font-heading": fontStack(fonts.heading, "sans"),
    ...Object.fromEntries(
      Object.entries(resolved.shadows).map(([size, value]) => [
        `shadow-${size}`,
        value,
      ]),
    ),
    // Only when they differ from Tailwind's defaults: keep installs minimal.
    ...(resolved.letterSpacing !== 0 && {
      "tracking-normal": `${resolved.letterSpacing}em`,
    }),
    ...(resolved.spacing !== 0.25 && { spacing: `${resolved.spacing}rem` }),
  };

  const colors = (mode: Mode) => ({
    ...Object.fromEntries(
      COLOR_TOKENS.map((token) => [
        token,
        formatOklch(resolved.colors[mode][token]),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(resolved.semantic[mode]).map(([name, color]) => [
        name,
        formatOklch(color),
      ]),
    ),
    // Contrast-checked colours DESIGN.md's component classes use.
    ...Object.fromEntries(
      Object.entries(resolved.components.colors[mode]).map(([name, color]) => [
        `tv-${kebab(name)}`,
        formatOklch(color),
      ]),
    ),
  });

  return {
    $schema: REGISTRY_ITEM_SCHEMA,
    name,
    type: "registry:theme",
    title: resolved.theme.name,
    description: `A Thevio theme. ${REGISTRY_NOTE}`,
    docs: docs(resolved),
    categories: ["theme"],
    cssVars: {
      theme,
      // In both modes: a theme installed before (tweakcn's, say) may have
      // left its own `--radius` in `.dark`, which would win in dark mode.
      light: { radius: `${resolved.radius.base}rem`, ...colors("light") },
      dark: { radius: `${resolved.radius.base}rem`, ...colors("dark") },
    },
    meta: { thevio: studioLink(resolved), generator: SITE },
  };
}

export function toShadcnRegistry(resolved: ResolvedTheme): ExportFile[] {
  return [
    jsonFile(
      `registry/${slug(resolved.theme.name)}.json`,
      toRegistryItem(resolved),
    ),
  ];
}
