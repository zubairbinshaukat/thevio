// The sample themes Thevio shows off: on the landing page and in the Studio's
// style comparison. Inputs only; every value shown is derived from them by the
// engine (validateAndFix, then resolveTheme).

import type { ThemeInput } from "@/core/theme/schema";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
export const THEME_IDS = ["default", "grove", "ember", "iris"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Sample inputs. Each goes through validateAndFix like any user theme. */
export const SAMPLES: Record<ThemeId, { label: string; input: ThemeInput }> = {
  default: { label: "Default", input: { v: 1 } },
  grove: {
    label: "Grove",
    input: {
      v: 1,
      name: "Grove",
      colors: {
        brand: [0.6, 0.13, 163],
        neutral: { hue: 165, chroma: 0.012 },
      },
      radius: 0.875,
      shadow: {
        y: 4,
        blur: 14,
        spread: -2,
        opacity: 0.12,
        color: [0.35, 0.06, 163],
      },
      components: STYLE_PRESETS.soft,
    },
  },
  ember: {
    label: "Ember",
    input: {
      v: 1,
      name: "Ember",
      colors: {
        brand: [0.64, 0.19, 38],
        neutral: { hue: 50, chroma: 0.01 },
        secondary: [0.84, 0.1, 75],
      },
      radius: 1.25,
      shadow: {
        y: 3,
        blur: 12,
        spread: -2,
        opacity: 0.1,
        color: [0.4, 0.08, 40],
      },
      components: {
        ...STYLE_PRESETS.shadcn,
        buttonShape: "pill",
        surfaceStyle: "both",
      },
    },
  },
  iris: {
    label: "Iris",
    input: {
      v: 1,
      name: "Iris",
      colors: {
        brand: [0.52, 0.24, 292],
        neutral: { hue: 290, chroma: 0.02 },
      },
      radius: 0.375,
      components: STYLE_PRESETS.crisp,
    },
  },
};
