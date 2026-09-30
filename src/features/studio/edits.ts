// Pure theme edits behind the Studio's controls. Every edit returns a new,
// schema-valid Theme (numbers clamped, colours normalised), so the store can
// never hold a theme a share link or the API would reject.

import {
  type ColorValue,
  type Theme,
  ThemeSchemaV1,
} from "@/core/theme/schema";
import {
  type ComponentTokens,
  STYLE_PRESETS,
  type StylePresetName,
} from "@/core/theme/style-presets";
import type { ColorToken } from "@/core/theme/tokens";
import { validateAndFix } from "@/core/theme/validate-and-fix";

/** Run a theme through the schema again. Null if it isn't valid. */
export function normalizeTheme(theme: unknown): Theme | null {
  const result = ThemeSchemaV1.safeParse(theme);
  return result.success ? result.data : null;
}

/** Themes are plain data in schema order, so JSON equality is exact. */
export function sameTheme(a: Theme, b: Theme): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

// Pinned colours (overrides) win over anything derived. A pin made for one
// brand (say, a contrast fix) is stale once the brand changes, and would make
// the brand control look broken, so editing a seed drops the pins it feeds.

const BRAND_TOKENS: readonly ColorToken[] = [
  "primary",
  "primary-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "ring",
  "sidebar-ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

const NEUTRAL_TOKENS: readonly ColorToken[] = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

function withoutPins(
  overrides: Theme["overrides"],
  tokens: readonly ColorToken[],
): Theme["overrides"] {
  const drop = (pins: Theme["overrides"]["light"]) => {
    if (!pins) return undefined;
    const kept = Object.fromEntries(
      Object.entries(pins).filter(
        ([token]) => !tokens.includes(token as ColorToken),
      ),
    );
    return Object.keys(kept).length > 0 ? kept : undefined;
  };
  const light = drop(overrides.light);
  const dark = drop(overrides.dark);
  return { ...(light ? { light } : {}), ...(dark ? { dark } : {}) };
}

/** How many colours are pinned, across both modes. */
export function pinCount(theme: Theme): number {
  return (
    Object.keys(theme.overrides.light ?? {}).length +
    Object.keys(theme.overrides.dark ?? {}).length
  );
}

export function setBrand(theme: Theme, brand: ColorValue): Theme {
  return {
    ...theme,
    colors: { ...theme.colors, brand },
    overrides: withoutPins(theme.overrides, BRAND_TOKENS),
  };
}

export function setNeutral(
  theme: Theme,
  neutral: Partial<Theme["colors"]["neutral"]>,
): Theme {
  return {
    ...theme,
    colors: {
      ...theme.colors,
      neutral: { ...theme.colors.neutral, ...neutral },
    },
    overrides: withoutPins(theme.overrides, NEUTRAL_TOKENS),
  };
}

export function clearPins(theme: Theme): Theme {
  return { ...theme, overrides: {} };
}

export function applyStylePreset(theme: Theme, name: StylePresetName): Theme {
  return { ...theme, components: { ...STYLE_PRESETS[name] } };
}

export function setComponent<K extends keyof ComponentTokens>(
  theme: Theme,
  key: K,
  value: ComponentTokens[K],
): Theme {
  return { ...theme, components: { ...theme.components, [key]: value } };
}

export type FontRole = keyof Theme["fonts"];

/** `null` for the heading means "same as body". */
export function setFont(
  theme: Theme,
  role: FontRole,
  family: string | null,
): Theme {
  const fonts = { ...theme.fonts };
  if (role === "heading") {
    if (family) fonts.heading = family;
    else delete fonts.heading;
  } else if (family) {
    fonts[role] = family;
  }
  return { ...theme, fonts };
}

/**
 * Fix every failing contrast pair, pinning the moved colours. Returns the
 * theme unchanged (same object) if nothing needed fixing.
 */
export function fixAllContrast(theme: Theme): { theme: Theme; fixed: number } {
  const result = validateAndFix(theme);
  if (!result.ok) return { theme, fixed: 0 };
  const fixed = result.fixes.filter((fix) => fix.kind === "contrast").length;
  return fixed > 0 ? { theme: result.theme, fixed } : { theme, fixed: 0 };
}
