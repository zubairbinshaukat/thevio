import { describe, expect, it } from "vitest";
import { decodeTheme } from "../codec/decode";
import { encodeTheme } from "../codec/encode";
import { checkPairs } from "../contrast/pairs";
import { MODES, resolveTheme } from "./resolve";
import type { Theme } from "./schema";
import { type ValidateResult, validateAndFix } from "./validate-and-fix";

function valid(result: ValidateResult) {
  if (!result.ok) throw new Error(result.error);
  return result;
}

const allPass = (theme: Theme) =>
  MODES.every((mode) =>
    checkPairs(resolveTheme(theme).colors[mode]).every((check) => check.pass),
  );

describe("validateAndFix", () => {
  it("turns a single brand colour into a theme that passes everywhere", () => {
    const result = valid(validateAndFix({ colors: { brand: "#ffe600" } }));
    expect(result.fixes.some((fix) => fix.kind === "contrast")).toBe(true);
    expect(result.unfixable).toEqual([]);
    expect(allPass(result.theme)).toBe(true);
  });

  it("keeps passing after a trip through a share link", () => {
    for (const brand of ["#ffe600", "#00d4ff", "#ff4fd8", "#7a7a7a"]) {
      const { theme } = valid(validateAndFix({ colors: { brand } }));
      const back = decodeTheme(encodeTheme(theme));
      if (!back) throw new Error("did not decode");
      expect(back).toEqual(theme);
      expect(allPass(back)).toBe(true);
    }
  });

  it("repairs messy input and says what it changed", () => {
    const result = valid(
      validateAndFix(
        {
          v: 1,
          name: "x".repeat(60),
          radius: 9,
          spacing: -1,
          colors: { brand: "not a colour", chart: ["#f00", "#0f0"] },
          shadow: { opacity: "lots" },
          surprise: true,
        },
        { contrast: false },
      ),
    );
    const byPath = Object.fromEntries(
      result.fixes.flatMap((fix) =>
        fix.kind === "schema" ? [[fix.path, fix]] : [],
      ),
    );
    expect(byPath.name).toMatchObject({ action: "trimmed" });
    expect(byPath.radius).toMatchObject({ action: "clamped", from: 9, to: 2 });
    expect(byPath.spacing).toMatchObject({ action: "clamped", to: 0.15 });
    expect(byPath["colors.brand"]).toMatchObject({ action: "defaulted" });
    expect(byPath["colors.chart"]).toMatchObject({ action: "defaulted" });
    expect(byPath["shadow.opacity"]).toMatchObject({
      action: "defaulted",
      to: 0.1,
    });
    expect(byPath.surprise).toMatchObject({ action: "dropped" });
    expect(result.theme.name).toHaveLength(40);
  });

  it("refuses input it can't treat as a theme", () => {
    expect(validateAndFix("hello")).toMatchObject({ ok: false });
    expect(validateAndFix([1, 2])).toMatchObject({ ok: false });
    expect(validateAndFix({ v: 99 })).toMatchObject({ ok: false });
  });

  it("can skip contrast fixing", () => {
    const result = valid(
      validateAndFix({ colors: { brand: "#ffe600" } }, { contrast: false }),
    );
    expect(result.fixes.filter((fix) => fix.kind === "contrast")).toEqual([]);
  });

  it("reports what it may not fix instead of forcing it", () => {
    const result = valid(
      validateAndFix(
        { overrides: { light: { "muted-foreground": "#dddddd" } } },
        { locked: ["muted-foreground", "muted", "background", "card"] },
      ),
    );
    expect(result.unfixable.map((u) => `${u.mode}:${u.fg}`)).toContain(
      "light:muted-foreground",
    );
  });

  it("is idempotent: a fixed theme needs no more fixes", () => {
    const { theme } = valid(validateAndFix({ colors: { brand: "#00d4ff" } }));
    expect(valid(validateAndFix(theme)).fixes).toEqual([]);
  });
});
