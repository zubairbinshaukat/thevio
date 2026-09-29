import { describe, expect, it } from "vitest";
import { formatOklch, oklch } from "../color/convert";
import type { ColorTokens } from "../theme/tokens";
import { type FixResult, fixContrast } from "./fix";
import { checkPairs, PAIRS } from "./pairs";
import {
  SHADCN_NEUTRAL_DARK,
  SHADCN_NEUTRAL_LIGHT,
} from "./shadcn-neutral.fixture";
import { contrastRatio } from "./wcag";

const summary = ({ fixes, impossible }: FixResult) => ({
  fixes: fixes.map(
    (fix) =>
      `${fix.token}: ${formatOklch(fix.from)} → ${formatOklch(fix.to)} (${fix.before.toFixed(2)} → ${fix.after.toFixed(2)})`,
  ),
  impossible: impossible.map(
    ({ pair, ratio }) => `${pair.fg} on ${pair.bg}: ${ratio.toFixed(2)}`,
  ),
});

describe("fixContrast on shadcn's neutral theme", () => {
  for (const [mode, tokens] of [
    ["light", SHADCN_NEUTRAL_LIGHT],
    ["dark", SHADCN_NEUTRAL_DARK],
  ] as const) {
    it(`leaves every pair passing (${mode})`, () => {
      const result = fixContrast(tokens);
      expect(result.impossible).toEqual([]);
      for (const check of checkPairs(result.tokens)) {
        expect(check.pass).toBe(true);
      }
    });

    it(`only touches tokens that failed (${mode})`, () => {
      const failing = new Set(
        checkPairs(tokens)
          .filter((check) => !check.pass)
          .map((check) => check.pair.fg),
      );
      const result = fixContrast(tokens);
      for (const fix of result.fixes) expect(failing.has(fix.token)).toBe(true);
      for (const check of checkPairs(tokens)) {
        if (check.pass && !failing.has(check.pair.fg)) {
          expect(result.tokens[check.pair.fg]).toBe(tokens[check.pair.fg]);
        }
      }
    });

    it(`matches the golden fixes (${mode})`, () => {
      expect(summary(fixContrast(tokens))).toMatchSnapshot();
    });
  }
});

describe("fixContrast rules", () => {
  it("never moves decorative dividers", () => {
    const tokens: ColorTokens = {
      ...SHADCN_NEUTRAL_LIGHT,
      border: oklch(0.99, 0, 0),
    };
    const result = fixContrast(tokens);
    expect(result.tokens.border).toBe(tokens.border);
  });

  it("moves the surface when the text is locked", () => {
    const tokens: ColorTokens = {
      ...SHADCN_NEUTRAL_LIGHT,
      primary: oklch(0.8, 0.15, 90),
      "primary-foreground": oklch(1, 0, 0),
    };
    const result = fixContrast(tokens, { locked: ["primary-foreground"] });
    expect(result.tokens["primary-foreground"]).toBe(
      tokens["primary-foreground"],
    );
    expect(result.tokens.primary.l).toBeLessThan(0.8);
    expect(result.tokens.primary.h).toBe(90);
    expect(
      contrastRatio(result.tokens["primary-foreground"], result.tokens.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("reports pairs it may not touch instead of forcing them", () => {
    const tokens: ColorTokens = {
      ...SHADCN_NEUTRAL_LIGHT,
      "muted-foreground": oklch(0.8, 0, 0),
    };
    const result = fixContrast(tokens, {
      locked: ["muted-foreground", "muted", "background", "card"],
    });
    expect(result.impossible.map(({ pair }) => pair.fg)).toContain(
      "muted-foreground",
    );
    expect(result.tokens["muted-foreground"]).toBe(tokens["muted-foreground"]);
  });

  it("fixes text that depends on a fill after fixing the fill", () => {
    // A pale yellow primary fails as a button on white, and so does its text.
    const tokens: ColorTokens = {
      ...SHADCN_NEUTRAL_LIGHT,
      primary: oklch(0.9, 0.15, 95),
      "primary-foreground": oklch(0.985, 0, 0),
    };
    const result = fixContrast(tokens);
    expect(result.impossible).toEqual([]);
    expect(
      contrastRatio(result.tokens.primary, result.tokens.background),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrastRatio(result.tokens["primary-foreground"], result.tokens.primary),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("checks the pairs in a stable order: fills, text, controls, charts", () => {
    const kinds = PAIRS.map((pair) => pair.kind);
    expect(kinds.indexOf("decorative")).toBeGreaterThan(
      kinds.lastIndexOf("ui"),
    );
    expect(PAIRS[0]?.fg).toBe("primary");
  });
});
