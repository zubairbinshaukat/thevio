// The Studio's contrast summary: every WCAG 2 pair the preview relies on, in
// both modes. Theme pairs (PAIRS) plus the ones component styles add.

import { checkComponentPairs } from "@/core/contrast/component-pairs";
import { checkPairs } from "@/core/contrast/pairs";
import { MODES, type Mode, type ResolvedTheme } from "@/core/theme/resolve";

export type FailingPair = {
  readonly mode: Mode;
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number;
  readonly min: number;
};

export type ContrastReport = {
  /** Pairs checked across both modes (decorative dividers excluded). */
  readonly checked: number;
  readonly failing: readonly FailingPair[];
};

export function contrastReport(resolved: ResolvedTheme): ContrastReport {
  let checked = 0;
  const failing: FailingPair[] = [];
  for (const mode of MODES) {
    const results = [
      ...checkPairs(resolved.colors[mode])
        .filter((result) => result.pair.kind !== "decorative")
        .map(({ pair, ratio, pass }) => ({ ...pair, ratio, pass })),
      ...checkComponentPairs(resolved, mode),
    ];
    checked += results.length;
    for (const { fg, bg, ratio, min, pass } of results) {
      if (!pass) failing.push({ mode, fg, bg, ratio, min });
    }
  }
  return { checked, failing };
}
