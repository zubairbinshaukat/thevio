// Server-side data for the Studio's style comparison: every sample theme,
// under every style preset, in both modes, as ready-to-apply preview scopes.

import { SAMPLES, THEME_IDS, type ThemeId } from "@/config/sample-themes";
import { formatOklch } from "@/core/color/convert";
import { checkComponentPairs } from "@/core/contrast/component-pairs";
import { type ScopeStyle, toScope } from "@/core/export/scope";
import { MODES, type Mode, resolveTheme } from "@/core/theme/resolve";
import { fromColorValue, type Theme } from "@/core/theme/schema";
import {
  STYLE_PRESETS,
  type StylePresetName,
} from "@/core/theme/style-presets";
import { validateAndFix } from "@/core/theme/validate-and-fix";

export const PRESET_IDS = Object.keys(STYLE_PRESETS) as StylePresetName[];

const PRESET_LABELS: Record<StylePresetName, string> = {
  shadcn: "shadcn",
  soft: "Soft",
  crisp: "Crisp",
};

type PresetScopes = Record<StylePresetName, Record<Mode, ScopeStyle>>;

export type CompareData = {
  themes: Record<ThemeId, { label: string; brand: string }>;
  presets: { id: StylePresetName; label: string; tokens: string[] }[];
  scopes: Record<ThemeId, PresetScopes>;
  /** Component contrast pairs checked (and passing) across everything shown. */
  pairsChecked: number;
};

function sampleTheme(id: ThemeId): Theme {
  const result = validateAndFix(SAMPLES[id].input);
  if (!result.ok) throw new Error(`Sample "${id}": ${result.error}`);
  return result.theme;
}

export function compareData(): CompareData {
  let pairsChecked = 0;

  const presetScopes = (theme: Theme, id: ThemeId): PresetScopes =>
    Object.fromEntries(
      PRESET_IDS.map((preset) => {
        const resolved = resolveTheme({
          ...theme,
          components: STYLE_PRESETS[preset],
        });
        for (const mode of MODES) {
          const pairs = checkComponentPairs(resolved, mode);
          const failing = pairs.filter((pair) => !pair.pass);
          if (failing.length) {
            throw new Error(`${id}/${preset}/${mode}: component pairs fail`);
          }
          pairsChecked += pairs.length;
        }
        return [
          preset,
          {
            light: toScope(resolved, "light"),
            dark: toScope(resolved, "dark"),
          },
        ];
      }),
    ) as PresetScopes;

  const themes = {} as CompareData["themes"];
  const scopes = {} as CompareData["scopes"];
  for (const id of THEME_IDS) {
    const theme = sampleTheme(id);
    themes[id] = {
      label: SAMPLES[id].label,
      brand: formatOklch(fromColorValue(theme.colors.brand)),
    };
    scopes[id] = presetScopes(theme, id);
  }

  return {
    themes,
    presets: PRESET_IDS.map((id) => ({
      id,
      label: PRESET_LABELS[id],
      tokens: Object.values(STYLE_PRESETS[id]),
    })),
    scopes,
    pairsChecked,
  };
}
