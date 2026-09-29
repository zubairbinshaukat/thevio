// Style presets set only the component tokens; colours are separate.
// Acceptance (plan §D.4): the same page under all three must read as three
// different products.

import type { Theme } from "./schema";

export type ComponentTokens = Theme["components"];

export const STYLE_PRESETS = {
  shadcn: {
    surfaceStyle: "border",
    density: "default",
    buttonShape: "rounded",
    buttonStyle: "solid",
    inputStyle: "outline",
    focusRing: "ring",
    tabStyle: "segmented",
  },
  // "Soft" and "Crisp" are working names (plan §I.3).
  soft: {
    surfaceStyle: "shadow",
    density: "comfortable",
    buttonShape: "pill",
    buttonStyle: "soft",
    inputStyle: "filled",
    focusRing: "glow",
    tabStyle: "pill",
  },
  crisp: {
    surfaceStyle: "flat",
    density: "compact",
    buttonShape: "square",
    buttonStyle: "outline",
    inputStyle: "underline",
    focusRing: "outline",
    tabStyle: "underline",
  },
} as const satisfies Record<string, ComponentTokens>;

export type StylePresetName = keyof typeof STYLE_PRESETS;

/** The preset these tokens match exactly, if any. */
export function matchStylePreset(
  tokens: ComponentTokens,
): StylePresetName | null {
  for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
    const same = (Object.keys(preset) as (keyof ComponentTokens)[]).every(
      (key) => preset[key] === tokens[key],
    );
    if (same) return name as StylePresetName;
  }
  return null;
}
