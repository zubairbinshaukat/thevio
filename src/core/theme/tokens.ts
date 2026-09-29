import type { Oklch } from "../color/convert";

/**
 * The colour variables a theme emits per mode: shadcn's 31, plus
 * `destructive-foreground` for tweakcn compatibility.
 */
export const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** One mode's resolved colours. */
export type ColorTokens = Readonly<Record<ColorToken, Oklch>>;

export const CHART_TOKENS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const satisfies readonly ColorToken[];
