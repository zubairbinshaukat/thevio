// Theme → ResolvedTheme: every derived value the previews and exporters need.
// Pure and deterministic; never stored. With the default neutral, the light
// tokens are shadcn's neutral theme except `primary`, which is the brand.

import { chartPalette } from "../color/chart";
import { formatOklch, type Oklch, oklch } from "../color/convert";
import {
  DARK_NEUTRAL_L,
  DARK_OVERLAY_ALPHA,
  darkAccent,
  darkNeutral,
  whiteOverlay,
} from "../color/dark";
import { mixOklch } from "../color/mix";
import { brandScale, neutralScale, type Scale } from "../color/scale";
import { fixForeground, fixLightness, pickOnColor } from "../contrast/solve";
import { contrastRatio, WCAG } from "../contrast/wcag";
import { fromColorValue, type Theme } from "./schema";
import type { ComponentTokens } from "./style-presets";
import { COLOR_TOKENS, type ColorToken, type ColorTokens } from "./tokens";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

export const SEMANTIC_NAMES = ["success", "warning", "info"] as const;
export type SemanticName = (typeof SEMANTIC_NAMES)[number];
export type SemanticTokens = Readonly<
  Record<SemanticName | `${SemanticName}-foreground`, Oklch>
>;

export const RADIUS_SCALE = {
  sm: 0.6,
  md: 0.8,
  lg: 1,
  xl: 1.4,
  "2xl": 1.8,
  "3xl": 2.2,
  "4xl": 2.6,
} as const;
export type RadiusSize = keyof typeof RADIUS_SCALE;

export const SHADOW_SIZES = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const;
export type ShadowSize = (typeof SHADOW_SIZES)[number];

/** One box-shadow layer; lengths in px. */
export type ShadowLayer = {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: Oklch;
};

export type ResolvedTheme = {
  readonly theme: Theme;
  readonly scales: {
    readonly brand: Scale;
    readonly neutral: Scale;
    readonly secondary: Scale | null;
  };
  /** shadcn's colour variables, per mode. */
  readonly colors: Readonly<Record<Mode, ColorTokens>>;
  /** Status colours beyond shadcn's set, per mode. */
  readonly semantic: Readonly<Record<Mode, SemanticTokens>>;
  /** Base radius and its scale, in rem. */
  readonly radius: { readonly base: number } & Readonly<
    Record<RadiusSize, number>
  >;
  /** The shadow scale as layers, px, for token formats. */
  readonly shadowLayers: Readonly<Record<ShadowSize, readonly ShadowLayer[]>>;
  /** The same scale as CSS box-shadow values. */
  readonly shadows: Readonly<Record<ShadowSize, string>>;
  readonly fonts: {
    readonly sans: string;
    readonly mono: string;
    readonly heading: string;
  };
  readonly letterSpacing: number;
  readonly spacing: number;
  readonly borderWidth: number;
  readonly components: {
    readonly tokens: ComponentTokens;
    /** `--tv-*` custom properties for the preview root. */
    readonly vars: Readonly<Record<string, string>>;
    /** `data-*` attributes for the preview root. */
    readonly attributes: Readonly<Record<string, string>>;
    /** Colours the component styles derive, per mode; contrast-checked. */
    readonly colors: Readonly<Record<Mode, ComponentColors>>;
  };
};

/**
 * Colours that component styles derive from the tokens. Computed here, not
 * with CSS color-mix, so their contrast is guaranteed and testable.
 */
export type ComponentColors = Readonly<{
  /** Soft button / pill tab fill: primary tinted into the page. */
  softBg: Oklch;
  /** Text on `softBg` (≥ 4.5:1). */
  softFg: Oklch;
  /** Primary used as text on the page and on cards (outline buttons, links; ≥ 4.5:1). */
  primaryText: Oklch;
  /** Filled input background. */
  field: Oklch;
  /** Input boundary line: underline inputs, filled inputs' bottom edge (≥ 3:1 on page, card and field). */
  line: Oklch;
}>;

const WHITE = oklch(1, 0, 0);

// ---------------------------------------------------------------------------
// Colours

type Palette = {
  page: Oklch;
  surface: Oklch;
  sidebar: Oklch;
  subtle: Oklch;
  subtleText: Oklch;
  text: Oklch;
  mutedText: Oklch;
  primary: Oklch;
  danger: Oklch;
  border: Oklch;
  input: Oklch;
  ring: Oklch;
  charts: readonly Oklch[];
};

function toTokens(p: Palette): Record<ColorToken, Oklch> {
  const chart = (i: number) => p.charts[i] ?? p.primary;
  const onPrimary = pickOnColor(p.primary);
  return {
    background: p.page,
    foreground: p.text,
    card: p.surface,
    "card-foreground": p.text,
    popover: p.surface,
    "popover-foreground": p.text,
    primary: p.primary,
    "primary-foreground": onPrimary,
    secondary: p.subtle,
    "secondary-foreground": p.subtleText,
    muted: p.subtle,
    "muted-foreground": p.mutedText,
    accent: p.subtle,
    "accent-foreground": p.subtleText,
    destructive: p.danger,
    "destructive-foreground": pickOnColor(p.danger),
    border: p.border,
    input: p.input,
    ring: p.ring,
    "chart-1": chart(0),
    "chart-2": chart(1),
    "chart-3": chart(2),
    "chart-4": chart(3),
    "chart-5": chart(4),
    sidebar: p.sidebar,
    "sidebar-foreground": p.text,
    "sidebar-primary": p.primary,
    "sidebar-primary-foreground": onPrimary,
    "sidebar-accent": p.subtle,
    "sidebar-accent-foreground": p.subtleText,
    "sidebar-border": p.border,
    "sidebar-ring": p.ring,
  };
}

function withOverrides(
  tokens: Record<ColorToken, Oklch>,
  overrides: Theme["overrides"]["light"],
): ColorTokens {
  if (!overrides) return tokens;
  for (const token of COLOR_TOKENS) {
    const value = overrides[token];
    if (value) tokens[token] = fromColorValue(value);
  }
  return tokens;
}

function resolveColors(theme: Theme) {
  const { colors, states } = theme;
  const brand = fromColorValue(colors.brand);
  const danger = fromColorValue(colors.semantic.danger);
  const secondary = colors.secondary ? fromColorValue(colors.secondary) : null;
  const neutral = neutralScale(colors.neutral);
  const secondaryScale = secondary ? brandScale(secondary) : null;

  const lightBg = WHITE;
  const darkBg = darkNeutral(DARK_NEUTRAL_L.background, colors.neutral);
  const dark = (color: Oklch, min: number) =>
    darkAccent(color, { lightBg, darkBg, min });

  const charts = (mode: Mode, background: Oklch) => {
    if (colors.chart) {
      const explicit = colors.chart.map(fromColorValue);
      return mode === "light"
        ? explicit
        : explicit.map((color) => dark(color, WCAG.ui));
    }
    return chartPalette(brand, {
      mode,
      background,
      monochrome: colors.chartStyle === "monochrome",
    }).colors;
  };

  const darkPrimary = dark(brand, WCAG.ui);
  const light = toTokens({
    page: lightBg,
    surface: lightBg,
    sidebar: neutral[50],
    subtle: secondaryScale ? secondaryScale[100] : neutral[100],
    subtleText: secondaryScale ? secondaryScale[900] : neutral[900],
    text: neutral[950],
    mutedText: neutral[500],
    primary: brand,
    danger,
    border: neutral[200],
    input: neutral[200],
    ring: states.focusRing === "brand" ? brand : neutral[400],
    charts: charts("light", lightBg),
  });

  // Dark fills take the secondary's hue (if any), capped to a faint tint.
  const subtleTint = secondary
    ? { hue: secondary.h, chroma: secondary.c }
    : colors.neutral;
  const darkText = darkNeutral(DARK_NEUTRAL_L.foreground, colors.neutral);
  const darkTokens = toTokens({
    page: darkBg,
    surface: darkNeutral(DARK_NEUTRAL_L.surface, colors.neutral),
    sidebar: darkNeutral(DARK_NEUTRAL_L.surface, colors.neutral),
    subtle: darkNeutral(DARK_NEUTRAL_L.subtle, subtleTint),
    subtleText: darkText,
    text: darkText,
    mutedText: darkNeutral(DARK_NEUTRAL_L.mutedForeground, colors.neutral),
    primary: darkPrimary,
    danger: dark(danger, WCAG.text),
    border: whiteOverlay(DARK_OVERLAY_ALPHA.border),
    input: whiteOverlay(DARK_OVERLAY_ALPHA.input),
    ring:
      states.focusRing === "brand"
        ? darkPrimary
        : darkNeutral(DARK_NEUTRAL_L.ring, colors.neutral),
    charts: charts("dark", darkBg),
  });

  const semantic = (mode: Mode): SemanticTokens => {
    const entries = SEMANTIC_NAMES.flatMap((name) => {
      const base = fromColorValue(colors.semantic[name]);
      const color = mode === "light" ? base : dark(base, WCAG.ui);
      return [
        [name, color],
        [`${name}-foreground`, pickOnColor(color)],
      ];
    });
    return Object.fromEntries(entries) as SemanticTokens;
  };

  return {
    scales: { brand: brandScale(brand), neutral, secondary: secondaryScale },
    colors: {
      light: withOverrides(light, theme.overrides.light),
      dark: withOverrides(darkTokens, theme.overrides.dark),
    },
    semantic: { light: semantic("light"), dark: semantic("dark") },
  };
}

// ---------------------------------------------------------------------------
// Shape, depth and components

const round = (value: number, digits = 4) =>
  Math.round(value * 10 ** digits) / 10 ** digits;
const px = (value: number) => `${round(value, 2)}px`;

/** tweakcn-compatible scale: one base shadow, plus a contact layer from sm. */
function resolveShadowLayers({
  shadow,
}: Theme): Record<ShadowSize, ShadowLayer[]> {
  const color = shadow.color ? fromColorValue(shadow.color) : oklch(0, 0, 0);
  const tint = (factor: number) =>
    oklch(
      color.l,
      color.c,
      color.h,
      round(Math.min(1, shadow.opacity * factor), 3),
    );
  const base = (factor: number): ShadowLayer => ({
    x: shadow.x,
    y: shadow.y,
    blur: shadow.blur,
    spread: shadow.spread,
    color: tint(factor),
  });
  const layered = (y: number, blur: number): ShadowLayer[] => [
    base(1),
    { x: shadow.x, y, blur, spread: shadow.spread - 1, color: tint(1) },
  ];
  return {
    "2xs": [base(0.5)],
    xs: [base(0.5)],
    sm: layered(1, 2),
    md: layered(2, 4),
    lg: layered(4, 6),
    xl: layered(8, 10),
    "2xl": [base(2.5)],
  };
}

const formatShadow = (layers: readonly ShadowLayer[]) =>
  layers
    .map(
      ({ x, y, blur, spread, color }) =>
        `${px(x)} ${px(y)} ${px(blur)} ${px(spread)} ${formatOklch(color)}`,
    )
    .join(", ");

const CONTROL_HEIGHT = { compact: 2, default: 2.25, comfortable: 2.5 };
const PADDING_X = { compact: 0.75, default: 1, comfortable: 1.25 };
const GAP = { compact: 0.5, default: 0.75, comfortable: 1 };
const CARD_PAD = { compact: 1, default: 1.5, comfortable: 2 };
const ROW_HEIGHT = { compact: 2, default: 2.5, comfortable: 3 };
const TEXT = { compact: 0.8125, default: 0.875, comfortable: 0.9375 };
/** How much primary tints a soft fill, per mode. */
const SOFT_TINT: Record<Mode, number> = { light: 0.12, dark: 0.2 };
/** An empty box-shadow that, unlike `none`, can sit in a comma list. */
const NO_SHADOW = "0 0 #0000";

function componentColors(tokens: ColorTokens, mode: Mode): ComponentColors {
  const { background, card, primary, foreground, muted, input } = tokens;
  const softBg = mixOklch(background, primary, SOFT_TINT[mode]);
  const softFg = fixLightness(primary, softBg, WCAG.text) ?? foreground;

  // Must pass on both the page and cards; fall back to plain text colour.
  let primaryText = fixLightness(primary, background, WCAG.text) ?? foreground;
  primaryText = fixLightness(primaryText, card, WCAG.text) ?? foreground;
  if (contrastRatio(primaryText, background) < WCAG.text) {
    primaryText = foreground;
  }

  const field = muted;
  let line = input;
  for (const surface of [background, card, field]) {
    line = fixForeground(line, surface, WCAG.ui) ?? line;
  }
  return { softBg, softFg, primaryText, field, line };
}
const FOCUS = {
  ring: { width: "3px", offset: "0px" },
  outline: { width: "2px", offset: "2px" },
  glow: { width: "4px", offset: "0px" },
};

function resolveComponents(
  theme: Theme,
  colors: Readonly<Record<Mode, ColorTokens>>,
) {
  const tokens = theme.components;
  const border = px(theme.border.width);
  const surface = {
    border: { border, shadow: NO_SHADOW },
    shadow: { border: "0px", shadow: "var(--shadow-sm)" },
    both: { border, shadow: "var(--shadow-sm)" },
    flat: { border: "0px", shadow: NO_SHADOW },
  }[tokens.surfaceStyle];
  const buttonRadius = {
    square: "0.125rem",
    rounded: `${round(theme.radius)}rem`,
    pill: "9999px",
  }[tokens.buttonShape];

  return {
    tokens,
    vars: {
      "--tv-control-h": `${CONTROL_HEIGHT[tokens.density]}rem`,
      "--tv-pad-x": `${PADDING_X[tokens.density]}rem`,
      "--tv-gap": `${GAP[tokens.density]}rem`,
      "--tv-card-pad": `${CARD_PAD[tokens.density]}rem`,
      "--tv-row-h": `${ROW_HEIGHT[tokens.density]}rem`,
      "--tv-text": `${TEXT[tokens.density]}rem`,
      "--tv-btn-radius": buttonRadius,
      "--tv-surface-border": surface.border,
      "--tv-surface-shadow": surface.shadow,
      "--tv-ring-width": FOCUS[tokens.focusRing].width,
      "--tv-ring-offset": FOCUS[tokens.focusRing].offset,
      "--tv-hover-shift": `${theme.states.hoverShift}`,
    },
    attributes: {
      "data-surface": tokens.surfaceStyle,
      "data-density": tokens.density,
      "data-button": tokens.buttonShape,
      "data-button-style": tokens.buttonStyle,
      "data-input": tokens.inputStyle,
      "data-focus": tokens.focusRing,
      "data-tabs": tokens.tabStyle,
    },
    colors: {
      light: componentColors(colors.light, "light"),
      dark: componentColors(colors.dark, "dark"),
    },
  };
}

// ---------------------------------------------------------------------------

export function resolveTheme(theme: Theme): ResolvedTheme {
  const radius = Object.fromEntries(
    Object.entries(RADIUS_SCALE).map(([size, factor]) => [
      size,
      round(theme.radius * factor),
    ]),
  ) as Record<RadiusSize, number>;

  const colors = resolveColors(theme);
  const shadowLayers = resolveShadowLayers(theme);
  return {
    theme,
    ...colors,
    radius: { base: theme.radius, ...radius },
    shadowLayers,
    shadows: Object.fromEntries(
      SHADOW_SIZES.map((size) => [size, formatShadow(shadowLayers[size])]),
    ) as Record<ShadowSize, string>,
    fonts: {
      sans: theme.fonts.sans,
      mono: theme.fonts.mono,
      heading: theme.fonts.heading ?? theme.fonts.sans,
    },
    letterSpacing: theme.letterSpacing,
    spacing: theme.spacing,
    borderWidth: theme.border.width,
    components: resolveComponents(theme, colors.colors),
  };
}
