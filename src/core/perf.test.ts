// M1's budget: a full theme recompute (every scale, both modes, charts,
// component colours, every contrast pair checked) must fit well inside a
// frame. Measures the real resolver on fresh brands, like dragging the brand
// slider: no cache hits.

import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme/resolve";
import { type Theme, ThemeSchemaV1 } from "./theme/schema";

const BUDGET_MS = 5;
const RUNS = 3;
const SAMPLES = 60;

const theme = (hue: number): Theme =>
  ThemeSchemaV1.parse({
    v: 1,
    colors: { brand: [0.58, 0.19, hue], neutral: { hue, chroma: 0.012 } },
  });

function medianMs(hues: number[]): number {
  const themes = hues.map(theme);
  const times = themes.map((t) => {
    const start = performance.now();
    resolveTheme(t);
    return performance.now() - start;
  });
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)] ?? 0;
}

describe("engine performance", () => {
  it(`recomputes a whole theme in under ${BUDGET_MS} ms`, () => {
    for (let i = 0; i < 10; i++) resolveTheme(theme(i * 7));

    // The suite runs files in parallel, so one run can be slowed by other
    // workers. Take the best of a few medians: a real slowdown still fails.
    const medians = Array.from({ length: RUNS }, (_, run) =>
      medianMs(
        Array.from({ length: SAMPLES }, (_, i) => 100 + run * 0.37 + i * 4.3),
      ),
    );
    expect(Math.min(...medians)).toBeLessThan(BUDGET_MS);
  });
});
