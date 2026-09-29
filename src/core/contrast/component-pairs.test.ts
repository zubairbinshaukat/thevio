import { describe, expect, it } from "vitest";
import { MODES, resolveTheme } from "../theme/resolve";
import { STYLE_PRESETS } from "../theme/style-presets";
import { validateAndFix } from "../theme/validate-and-fix";
import { checkComponentPairs } from "./component-pairs";

// Brands that stress the derived colours: light, dark, saturated, grey.
const BRANDS = [
  "#2563eb",
  "#facc15",
  "#0f172a",
  "#16a34a",
  "#e11d48",
  "#9ca3af",
];

describe("checkComponentPairs", () => {
  for (const brand of BRANDS) {
    for (const [preset, components] of Object.entries(STYLE_PRESETS)) {
      it(`${brand} · ${preset}: every component pair passes in both modes`, () => {
        const result = validateAndFix({
          v: 1,
          colors: { brand, neutral: { hue: 250, chroma: 0.02 } },
          components,
        });
        if (!result.ok) throw new Error(result.error);
        const resolved = resolveTheme(result.theme);
        for (const mode of MODES) {
          const failing = checkComponentPairs(resolved, mode).filter(
            (pair) => !pair.pass,
          );
          expect({ mode, failing }).toEqual({ mode, failing: [] });
        }
      });
    }
  }
});
