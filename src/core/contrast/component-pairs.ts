// Contrast pairs introduced by component styles (WCAG 2 only). The colours
// are derived in resolve.ts so these pass by construction; this module is
// what proves it, and what the Studio's contrast panel will list.
//
// Pairs already in PAIRS are not repeated: solid buttons use
// primary-foreground on primary, focus rings (ring, outline, and glow's
// solid 2px band) use ring on background/card, and underline tabs use
// primary on background.

import type { Oklch } from "../color/convert";
import type { Mode, ResolvedTheme } from "../theme/resolve";
import { contrastRatio, WCAG } from "./wcag";

export type ComponentPair = {
  /** Which styles rely on it, e.g. "soft button, pill tab". */
  readonly usedBy: string;
  readonly fg: string;
  readonly bg: string;
  readonly min: number;
};

export type ComponentPairResult = ComponentPair & {
  readonly ratio: number;
  readonly pass: boolean;
};

export function checkComponentPairs(
  resolved: ResolvedTheme,
  mode: Mode,
): ComponentPairResult[] {
  const c = resolved.components.colors[mode];
  const t = resolved.colors[mode];
  const pairs: (ComponentPair & { fgColor: Oklch; bgColor: Oklch })[] = [
    {
      usedBy: "soft button, pill tab",
      fg: "tv-soft-fg",
      bg: "tv-soft-bg",
      fgColor: c.softFg,
      bgColor: c.softBg,
      min: WCAG.text,
    },
    {
      usedBy: "outline button, link",
      fg: "tv-primary-text",
      bg: "background",
      fgColor: c.primaryText,
      bgColor: t.background,
      min: WCAG.text,
    },
    {
      usedBy: "outline button, link",
      fg: "tv-primary-text",
      bg: "card",
      fgColor: c.primaryText,
      bgColor: t.card,
      min: WCAG.text,
    },
    {
      usedBy: "filled input text",
      fg: "foreground",
      bg: "tv-field",
      fgColor: t.foreground,
      bgColor: c.field,
      min: WCAG.text,
    },
    ...(["background", "card"] as const).map((bg) => ({
      usedBy: "underline input boundary",
      fg: "tv-line",
      bg,
      fgColor: c.line,
      bgColor: t[bg],
      min: WCAG.ui,
    })),
    {
      usedBy: "filled input boundary",
      fg: "tv-line",
      bg: "tv-field",
      fgColor: c.line,
      bgColor: c.field,
      min: WCAG.ui,
    },
  ];
  return pairs.map(({ fgColor, bgColor, ...pair }) => {
    const ratio = contrastRatio(fgColor, bgColor);
    return { ...pair, ratio, pass: ratio >= pair.min };
  });
}
