import type { Oklch } from "../color/convert";
import type { Gamut } from "../color/gamut";
import type { ColorToken, ColorTokens } from "../theme/tokens";
import { checkPairs, PAIRS, type Pair, type PairResult } from "./pairs";
import { fixForeground, fixLightness } from "./solve";
import { contrastRatio } from "./wcag";

export type TokenFix = {
  readonly token: ColorToken;
  readonly from: Oklch;
  readonly to: Oklch;
  /** The pairs that made this token move. */
  readonly pairs: readonly Pair[];
  /** Worst ratio across those pairs, before and after. */
  readonly before: number;
  readonly after: number;
};

export type FixResult = {
  readonly tokens: ColorTokens;
  readonly fixes: readonly TokenFix[];
  /** Pairs still failing: every token involved was locked or unfixable. */
  readonly impossible: readonly PairResult[];
};

export type FixOptions = {
  pairs?: readonly Pair[];
  /** Tokens the user pinned. Their pair partner moves instead. */
  locked?: readonly ColorToken[];
  gamut?: Gamut;
};

// Pairs interact (a fill moves, then the text on it must follow), so run the
// list twice. Every step only ever increases contrast on the pair it touches.
const PASSES = 2;

/**
 * Fix every failing pair with the smallest change: the pair's `fg` token moves
 * (opacity, then lightness, hue kept); if it's locked, the `bg` moves instead.
 * Decorative pairs are never touched.
 */
export function fixContrast(
  input: ColorTokens,
  { pairs = PAIRS, locked = [], gamut = "rgb" }: FixOptions = {},
): FixResult {
  const tokens: Record<ColorToken, Oklch> = { ...input };
  const isLocked = new Set(locked);
  const touched = new Map<ColorToken, Pair[]>();

  for (let pass = 0; pass < PASSES; pass++) {
    for (const pair of pairs) {
      if (pair.kind === "decorative") continue;
      const fg = tokens[pair.fg];
      const bg = tokens[pair.bg];
      if (contrastRatio(fg, bg) >= pair.min) continue;

      let token: ColorToken;
      let fixed: Oklch | null;
      if (!isLocked.has(pair.fg)) {
        token = pair.fg;
        fixed = fixForeground(fg, bg, pair.min, gamut);
      } else if (!isLocked.has(pair.bg) && (fg.alpha ?? 1) >= 1) {
        // The ratio is symmetric for opaque colours, so the same solver works
        // with the roles swapped.
        token = pair.bg;
        fixed = fixLightness(bg, fg, pair.min, gamut);
      } else {
        continue;
      }
      if (!fixed) continue;

      tokens[token] = fixed;
      const seen = touched.get(token) ?? [];
      if (!seen.includes(pair)) seen.push(pair);
      touched.set(token, seen);
    }
  }

  const worst = (source: Record<ColorToken, Oklch>, list: readonly Pair[]) =>
    Math.min(
      ...list.map((pair) => contrastRatio(source[pair.fg], source[pair.bg])),
    );

  const fixes: TokenFix[] = [...touched].map(([token, list]) => ({
    token,
    from: input[token],
    to: tokens[token],
    pairs: list,
    before: worst(input, list),
    after: worst(tokens, list),
  }));

  return {
    tokens,
    fixes,
    impossible: checkPairs(tokens, pairs).filter((result) => !result.pass),
  };
}
