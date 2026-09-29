// Everything the landing page shows, computed by the real engine at build
// time. Nothing here is typed in by hand except the sample themes' inputs.
// Server-only in practice (it pulls in zod, culori and lz-string); client
// islands receive plain, serialisable slices of it.

import { decompressFromEncodedURIComponent } from "lz-string";
import { SAMPLES, THEME_IDS, type ThemeId } from "@/config/sample-themes";
import { encodeTheme } from "@/core/codec/encode";
import { pathForKey } from "@/core/codec/keys";
import { formatHex, formatOklch, type Oklch } from "@/core/color/convert";
import { mapToGamut } from "@/core/color/gamut";
import { nearestStep, type Scale, STEPS } from "@/core/color/scale";
import { checkPairs, PAIRS } from "@/core/contrast/pairs";
import { contrastRatio } from "@/core/contrast/wcag";
import { toCss } from "@/core/export/css";
import { toScss } from "@/core/export/scss";
import { toTailwind } from "@/core/export/tailwind";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import {
  MODES,
  type Mode,
  type ResolvedTheme,
  resolveTheme,
} from "@/core/theme/resolve";
import { fromColorValue } from "@/core/theme/schema";
import { matchStylePreset } from "@/core/theme/style-presets";
import type { ColorToken } from "@/core/theme/tokens";
import { validateAndFix } from "@/core/theme/validate-and-fix";

export { THEME_IDS, type ThemeId };

const css = (color: Oklch) => formatOklch(color);
const hex = (color: Oklch) => formatHex(mapToGamut(color));
const round2 = (n: number) => Math.round(n * 100) / 100;

// Flags are only present when true, to keep the page payload small.
export type Swatch = {
  step: number;
  css: string;
  l: number;
  /** The step the input colour landed on. */
  base?: true;
  /** A dark swatch: labels on it should be light. */
  dark?: true;
};

function swatches(scale: Scale, base: Oklch | null): Swatch[] {
  const baseStep = base ? nearestStep(base) : null;
  return STEPS.map((step) => {
    const color = scale[step];
    return {
      step,
      css: css(color),
      l: round2(color.l),
      ...(step === baseStep && { base: true as const }),
      ...(color.l <= 0.62 && { dark: true as const }),
    };
  });
}

export type PairRow = {
  fg: ColorToken;
  bg: ColorToken;
  ratio: number;
  /** 4.5 for text pairs, 3 for UI parts (WCAG 1.4.3 / 1.4.11). */
  min: number;
  /** Highest WCAG level reached. */
  level: "AAA" | "AA" | "UI" | "Fail";
};

/** The pairs shown on the page; totals always cover every pair. */
const SHOWN: readonly [ColorToken, ColorToken][] = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["destructive-foreground", "destructive"],
  ["primary", "background"],
  ["input", "background"],
  ["chart-2", "card"],
];

function pairRows(resolved: ResolvedTheme, mode: Mode) {
  const results = checkPairs(resolved.colors[mode]);
  const rows: PairRow[] = SHOWN.map(([fg, bg]) => {
    const found = results.find((r) => r.pair.fg === fg && r.pair.bg === bg);
    if (!found) throw new Error(`Pair ${fg}/${bg} is not in PAIRS`);
    const { pair, ratio, pass } = found;
    const level =
      pair.kind === "text"
        ? ratio >= 7
          ? "AAA"
          : ratio >= 4.5
            ? "AA"
            : "Fail"
        : pass
          ? "UI"
          : "Fail";
    return { fg, bg, ratio: round2(ratio), min: pair.min, level };
  });
  const gated = results.filter((r) => r.pair.kind !== "decorative");
  return {
    rows,
    checked: gated.length,
    passing: gated.filter((r) => r.pass).length,
  };
}

/** The colour tokens the page's previews actually paint with. */
const SCOPE_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const satisfies readonly ColorToken[];

/** Every `[fg, bg]` shown on the page must be paintable in a scope. */
for (const pair of SHOWN.flat()) {
  if (!(SCOPE_TOKENS as readonly string[]).includes(pair)) {
    throw new Error(`Scope is missing "${pair}", used by a shown pair`);
  }
}

const COMPONENT_VARS = [
  "--tv-control-h",
  "--tv-pad-x",
  "--tv-btn-radius",
  "--tv-surface-border",
  "--tv-surface-shadow",
];

/** CSS custom properties for a preview scope, per mode (only what's used). */
function scopeVars(resolved: ResolvedTheme, mode: Mode): string {
  const semantic = resolved.semantic[mode];
  const vars: [string, string][] = [
    ...SCOPE_TOKENS.map((token): [string, string] => [
      token,
      css(resolved.colors[mode][token]),
    ]),
    ["success", css(semantic.success)],
    ["warning", css(semantic.warning)],
    ["info", css(semantic.info)],
  ];
  if (mode === "light") {
    const { vars: component } = resolved.components;
    vars.push(
      ["radius", `${resolved.radius.base}rem`],
      ["hue", `${round2(fromColorValue(resolved.theme.colors.brand).h)}`],
      // --tv-surface-shadow points at the theme's own --shadow-sm.
      ["shadow-sm", resolved.shadows.sm],
      ...COMPONENT_VARS.map((name): [string, string] => [
        name.slice(2),
        component[name] ?? "",
      ]),
    );
  }
  return vars.map(([name, value]) => `--${name}:${value}`).join(";");
}

/** One <style> for every sample: `.tv-scope[data-theme=…]`, both modes. */
export function scopeStyles(): string {
  return THEME_IDS.map((id) => {
    const { resolved } = SHOWCASE_INTERNAL[id];
    const scope = `.tv-scope[data-theme="${id}"]`;
    return [
      `${scope}{${scopeVars(resolved, "light")}}`,
      `.dark ${scope}:not([data-mode="light"]),${scope}[data-mode="dark"]{${scopeVars(resolved, "dark")}}`,
    ].join("\n");
  }).join("\n");
}

function build(id: ThemeId) {
  const { label, input } = SAMPLES[id];
  const result = validateAndFix(input);
  if (!result.ok) throw new Error(`Sample "${id}" is invalid: ${result.error}`);
  if (result.unfixable.length) {
    throw new Error(`Sample "${id}" has contrast pairs that can't be fixed`);
  }
  // What the page shows is the fixed theme, like every Thevio output. The
  // unfixed input is kept only to report how many pairs it passed before.
  const theme = result.theme;
  const resolved = resolveTheme(theme);
  const raw = validateAndFix(input, { contrast: false });
  if (!raw.ok) throw new Error(`Sample "${id}" is invalid: ${raw.error}`);
  const brand = fromColorValue(theme.colors.brand);
  const t = encodeTheme(theme);
  const payload = JSON.parse(
    decompressFromEncodedURIComponent(t.slice(1)) ?? "{}",
  ) as Record<string, unknown>;
  const contrast = Object.fromEntries(
    MODES.map((mode) => [mode, pairRows(resolved, mode)]),
  ) as Record<Mode, ReturnType<typeof pairRows>>;
  const charts = MODES.map((mode) => ({
    mode,
    ratios: (
      ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const
    ).map((token) =>
      round2(
        contrastRatio(
          resolved.colors[mode][token],
          resolved.colors[mode].background,
        ),
      ),
    ),
  }));

  const data = {
    id,
    label,
    hue: round2(brand.h),
    brand: { css: css(brand), hex: hex(brand), step: nearestStep(brand) },
    radius: theme.radius,
    preset: matchStylePreset(theme.components),
    components: theme.components,
    neutral: theme.colors.neutral,
    scales: [
      { name: "Brand", swatches: swatches(resolved.scales.brand, brand) },
      ...(resolved.scales.secondary && theme.colors.secondary
        ? [
            {
              name: "Secondary",
              swatches: swatches(
                resolved.scales.secondary,
                fromColorValue(theme.colors.secondary),
              ),
            },
          ]
        : []),
      { name: "Neutral", swatches: swatches(resolved.scales.neutral, null) },
    ],
    semantic: MODES.map((mode) => ({
      mode,
      colors: (["destructive", "success", "warning", "info"] as const).map(
        (name) => {
          const color =
            name === "destructive"
              ? resolved.colors[mode].destructive
              : resolved.semantic[mode][name];
          return { name, css: css(color), hex: hex(color) };
        },
      ),
    })),
    contrast,
    /** Gated pairs the input passed before auto-fix, per mode. */
    passingBefore: Object.fromEntries(
      MODES.map((mode) => [mode, pairRows(raw.resolved, mode).passing]),
    ) as Record<Mode, number>,
    charts,
    fixes: result.fixes
      .filter((fix) => fix.kind === "contrast")
      .map((fix) => ({
        mode: fix.mode,
        token: fix.token,
        before: round2(fix.before),
        after: round2(fix.after),
      })),
    share: {
      t,

      length: t.length,
      /** The decoded link: short key, packed value, and the field it maps to. */
      payload: Object.entries(payload).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        path: pathForKey(key) ?? "?",
      })),
    },
    exports: {
      css: toCss(resolved),
      tailwind: toTailwind(resolved),
      scss: toScss(resolved),
    },
  };
  return { data, resolved };
}

const SHOWCASE_INTERNAL = Object.fromEntries(
  THEME_IDS.map((id) => [id, build(id)]),
) as Record<ThemeId, ReturnType<typeof build>>;

export type ShowcaseTheme = ReturnType<typeof build>["data"];

export const SHOWCASE: Record<ThemeId, ShowcaseTheme> = Object.fromEntries(
  THEME_IDS.map((id) => [id, SHOWCASE_INTERNAL[id].data]),
) as Record<ThemeId, ShowcaseTheme>;

/** Link length of the untouched default theme (only `v` travels). */
export const DEFAULT_LINK_LENGTH = encodeTheme(DEFAULT_THEME).length;

/** Every gated pair, per mode: the page's totals come from this. */
export const PAIR_COUNT = PAIRS.filter((p) => p.kind !== "decorative").length;

/** What the hero's product shot needs, per sample. */
export type StageTheme = {
  label: string;
  brand: ShowcaseTheme["brand"];
  radius: number;
  preset: ShowcaseTheme["preset"];
  components: ShowcaseTheme["components"];
  neutral: ShowcaseTheme["neutral"];
  passing: Record<Mode, number>;
  checked: number;
  fixes: number;
  /** Each chart series against the page, per mode. */
  chartRatios: Record<Mode, number[]>;
  brandScale: Omit<Swatch, "l">[];
  share: Omit<ShowcaseTheme["share"], "payload">;
};

export function stageSlice(): Record<ThemeId, StageTheme> {
  return Object.fromEntries(
    THEME_IDS.map((id): [ThemeId, StageTheme] => {
      const t = SHOWCASE[id];
      return [
        id,
        {
          label: t.label,
          brand: t.brand,
          radius: t.radius,
          preset: t.preset,
          components: t.components,
          neutral: t.neutral,
          passing: {
            light: t.contrast.light.passing,
            dark: t.contrast.dark.passing,
          },
          checked: t.contrast.light.checked,
          fixes: t.fixes.length,
          chartRatios: Object.fromEntries(
            t.charts.map(({ mode, ratios }) => [mode, ratios]),
          ) as Record<Mode, number[]>,
          brandScale: (t.scales[0]?.swatches ?? []).map(
            ({ l: _l, ...swatch }) => swatch,
          ),
          share: { t: t.share.t, length: t.share.length },
        },
      ];
    }),
  ) as Record<ThemeId, StageTheme>;
}

export type ExportSnippets = ShowcaseTheme["exports"];

/** Every sample's export output; served by /showcase.json. */
export function exportsSlice(): Record<ThemeId, ExportSnippets> {
  return slice("exports");
}

/** Where the Export section fetches exportsSlice() from. */
export const EXPORTS_URL = "/showcase.json";

/** Pick one field of every sample, for a client island's props. */
export function slice<K extends keyof ShowcaseTheme>(
  key: K,
): Record<ThemeId, ShowcaseTheme[K]> {
  return Object.fromEntries(
    THEME_IDS.map((id) => [id, SHOWCASE[id][key]]),
  ) as Record<ThemeId, ShowcaseTheme[K]>;
}
