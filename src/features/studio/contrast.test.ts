import { describe, expect, it } from "vitest";
import { SAMPLES, THEME_IDS } from "@/config/sample-themes";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { resolveTheme } from "@/core/theme/resolve";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
import { validateAndFix } from "@/core/theme/validate-and-fix";
import { contrastReport } from "./contrast";
import { setBrand } from "./edits";

describe("contrastReport", () => {
  // What the Studio's old side-by-side page checked at build time.
  for (const id of THEME_IDS) {
    for (const preset of Object.keys(
      STYLE_PRESETS,
    ) as (keyof typeof STYLE_PRESETS)[]) {
      it(`${id} · ${preset}: every pair passes in both modes`, () => {
        const result = validateAndFix(SAMPLES[id].input);
        if (!result.ok) throw new Error(result.error);
        const theme = { ...result.theme, components: STYLE_PRESETS[preset] };
        const report = contrastReport(resolveTheme(theme));
        expect(report.failing).toEqual([]);
        expect(report.checked).toBeGreaterThan(50);
      });
    }
  }

  it("reports failures with their mode and ratio", () => {
    const pale = setBrand(DEFAULT_THEME, [0.97, 0.03, 100]);
    const { failing } = contrastReport(resolveTheme(pale));
    const primary = failing.find(
      (pair) => pair.mode === "light" && pair.fg === "primary",
    );
    expect(primary).toMatchObject({ bg: "background", min: 3 });
    expect(primary?.ratio).toBeLessThan(3);
  });
});
