import type { ColorToken, ColorTokens } from "../theme/tokens";
import { contrastRatio, WCAG } from "./wcag";

/**
 * - `text`: read as text (1.4.3).
 * - `ui`: a control boundary, focus ring or chart mark (1.4.11).
 * - `decorative`: dividers. Reported, never failed or fixed.
 */
export type PairKind = "text" | "ui" | "decorative";

/** `fg` is the token that moves when a fix is needed. */
export type Pair = {
  readonly fg: ColorToken;
  readonly bg: ColorToken;
  readonly min: number;
  readonly kind: PairKind;
};

const text = (fg: ColorToken, bg: ColorToken): Pair => ({
  fg,
  bg,
  min: WCAG.text,
  kind: "text",
});
const ui = (fg: ColorToken, bg: ColorToken): Pair => ({
  fg,
  bg,
  min: WCAG.ui,
  kind: "ui",
});
const decorative = (fg: ColorToken, bg: ColorToken): Pair => ({
  fg,
  bg,
  min: 1.2,
  kind: "decorative",
});

/**
 * Every pair checked per mode, in fix order: fills first (their text depends
 * on them), then text, then borders and rings, then charts.
 */
export const PAIRS: readonly Pair[] = [
  // Fills that sit on the page
  ui("primary", "background"),
  text("destructive", "background"),

  // Text
  text("foreground", "background"),
  text("card-foreground", "card"),
  text("popover-foreground", "popover"),
  text("primary-foreground", "primary"),
  text("secondary-foreground", "secondary"),
  text("accent-foreground", "accent"),
  text("destructive-foreground", "destructive"),
  text("muted-foreground", "muted"),
  text("muted-foreground", "background"),
  text("muted-foreground", "card"),
  text("sidebar-foreground", "sidebar"),
  text("sidebar-primary-foreground", "sidebar-primary"),
  text("sidebar-accent-foreground", "sidebar-accent"),

  // Control boundaries and focus
  ui("input", "background"),
  ui("ring", "background"),
  ui("ring", "card"),
  ui("sidebar-ring", "sidebar"),

  // Chart marks
  ui("chart-1", "background"),
  ui("chart-2", "background"),
  ui("chart-3", "background"),
  ui("chart-4", "background"),
  ui("chart-5", "background"),
  ui("chart-1", "card"),
  ui("chart-2", "card"),
  ui("chart-3", "card"),
  ui("chart-4", "card"),
  ui("chart-5", "card"),

  // Dividers: shown for information only
  decorative("border", "background"),
  decorative("sidebar-border", "sidebar"),
];

export type PairResult = {
  readonly pair: Pair;
  readonly ratio: number;
  readonly pass: boolean;
};

export function checkPair(tokens: ColorTokens, pair: Pair): PairResult {
  const ratio = contrastRatio(tokens[pair.fg], tokens[pair.bg]);
  return {
    pair,
    ratio,
    pass: pair.kind === "decorative" || ratio >= pair.min,
  };
}

export function checkPairs(
  tokens: ColorTokens,
  pairs: readonly Pair[] = PAIRS,
): PairResult[] {
  return pairs.map((pair) => checkPair(tokens, pair));
}
