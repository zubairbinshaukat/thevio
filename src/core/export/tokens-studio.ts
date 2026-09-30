// ResolvedTheme → one Tokens Studio for Figma file (single-file layout):
// token sets `global`, `light`, `dark`, plus `$themes` and `$metadata`.
//
// Tokens Studio specifics (tokens-studio/figma-plugin source):
// - DTCG keys (`$value`/`$type`) on every token; a group-level `$type` is
//   rejected by its schema, so each token carries its own;
// - references omit the set name (`{neutral.950}`, not `{global.…}`), and
//   resolve across the sets a theme marks "source" or "enabled";
// - colours as hex (`#rrggbbaa` with alpha): its rgb()/hsl() parsers split on
//   commas and misread modern syntax;
// - shadows are `boxShadow` with x/y keys, so they survive (unlike Figma's
//   native import).

import { formatHex, type Oklch, oklch } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import { STEPS } from "../color/scale";
import {
  MODES,
  type Mode,
  RADIUS_SCALE,
  type ResolvedTheme,
  SHADOW_SIZES,
} from "../theme/resolve";
import { COLOR_TOKENS } from "../theme/tokens";
import {
  COLOR_DESCRIPTIONS,
  COMPONENT_COLOR_DESCRIPTIONS,
  SEMANTIC_DESCRIPTIONS,
} from "./describe";
import {
  type ExportFile,
  jsonFile,
  kebab,
  lookupScale,
  parseCssLength,
  scaleIndex,
  scalesOf,
  slug,
} from "./format";

const ROOT_PX = 16;
const round = (value: number, digits = 2) =>
  Math.round(value * 10 ** digits) / 10 ** digits;
const pxString = (value: number) => `${round(value)}px`;

/** `#rrggbb`, or `#rrggbbaa` when translucent. */
export function studioHex(color: Oklch): string {
  const hex = formatHex(mapToGamut(oklch(color.l, color.c, color.h)));
  const alpha = color.alpha ?? 1;
  if (alpha >= 1) return hex;
  const byte = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}

function globalSet(resolved: ResolvedTheme) {
  const set: Record<string, unknown> = {};
  // Scales apart from the mode sets' tokens: `secondary` is both.
  set.palette = Object.fromEntries(
    scalesOf(resolved).map(([name, scale]) => [
      name,
      Object.fromEntries(
        STEPS.map((step) => [
          String(step),
          { $value: studioHex(scale[step]), $type: "color" },
        ]),
      ),
    ]),
  );
  set.radius = {
    base: {
      $value: pxString(resolved.radius.base * ROOT_PX),
      $type: "borderRadius",
    },
    ...Object.fromEntries(
      (Object.keys(RADIUS_SCALE) as (keyof typeof RADIUS_SCALE)[]).map(
        (size) => [
          size,
          {
            $value: pxString(resolved.radius[size] * ROOT_PX),
            $type: "borderRadius",
          },
        ],
      ),
    ),
  };
  set.spacing = {
    $value: pxString(resolved.spacing * ROOT_PX),
    $type: "spacing",
  };
  set["border-width"] = {
    $value: pxString(resolved.borderWidth),
    $type: "borderWidth",
  };
  set.font = {
    sans: { $value: resolved.fonts.sans, $type: "fontFamilies" },
    mono: { $value: resolved.fonts.mono, $type: "fontFamilies" },
    heading: { $value: resolved.fonts.heading, $type: "fontFamilies" },
  };
  set["letter-spacing"] = {
    $value: `${round(resolved.letterSpacing * 100)}%`,
    $type: "letterSpacing",
  };
  set.shadow = Object.fromEntries(
    SHADOW_SIZES.map((size) => [
      size,
      {
        $type: "boxShadow",
        $value: resolved.shadowLayers[size].map((layer) => ({
          x: round(layer.x),
          y: round(layer.y),
          blur: round(Math.max(0, layer.blur)),
          spread: round(layer.spread),
          color: studioHex(layer.color),
          type: "dropShadow",
        })),
      },
    ]),
  );

  const types: Record<string, [string, string]> = {
    "--tv-control-h": ["control-height", "sizing"],
    "--tv-pad-x": ["padding-x", "spacing"],
    "--tv-gap": ["gap", "spacing"],
    "--tv-card-pad": ["card-padding", "spacing"],
    "--tv-row-h": ["row-height", "sizing"],
    "--tv-text": ["font-size", "fontSizes"],
    "--tv-btn-radius": ["button-radius", "borderRadius"],
    "--tv-surface-border": ["surface-border-width", "borderWidth"],
    "--tv-ring-width": ["ring-width", "borderWidth"],
  };
  const component: Record<string, unknown> = {};
  for (const [cssName, raw] of Object.entries(resolved.components.vars)) {
    const entry = types[cssName];
    const length = parseCssLength(raw);
    if (!entry || !length) continue;
    const pxValue =
      length.unit === "rem" ? length.value * ROOT_PX : length.value;
    component[entry[0]] = { $value: pxString(pxValue), $type: entry[1] };
  }
  for (const [name, choice] of Object.entries(resolved.components.tokens)) {
    component[kebab(name)] = { $value: choice, $type: "other" };
  }
  set.component = component;
  return set;
}

function modeSet(resolved: ResolvedTheme, mode: Mode) {
  const index = scaleIndex(resolved);
  const token = (color: Oklch, description?: string) => {
    const at = lookupScale(index, color);
    return {
      $value: at ? `{palette.${at[0]}.${at[1]}}` : studioHex(color),
      $type: "color",
      ...(description && { $description: description }),
    };
  };
  const set: Record<string, unknown> = {};
  for (const name of COLOR_TOKENS) {
    set[name] = token(resolved.colors[mode][name], COLOR_DESCRIPTIONS[name]);
  }
  for (const [name, color] of Object.entries(resolved.semantic[mode])) {
    set[name] = token(color, SEMANTIC_DESCRIPTIONS[name]);
  }
  set["component-color"] = Object.fromEntries(
    Object.entries(resolved.components.colors[mode]).map(([name, color]) => [
      kebab(name),
      token(color, COMPONENT_COLOR_DESCRIPTIONS[name]),
    ]),
  );
  return set;
}

export function toTokensStudio(resolved: ResolvedTheme): ExportFile[] {
  const file = {
    global: globalSet(resolved),
    light: modeSet(resolved, "light"),
    dark: modeSet(resolved, "dark"),
    $themes: MODES.map((mode) => ({
      id: `thevio-${mode}`,
      name: mode === "light" ? "Light" : "Dark",
      group: "Mode",
      selectedTokenSets: { global: "source", [mode]: "enabled" },
    })),
    $metadata: { tokenSetOrder: ["global", ...MODES] },
  };
  return [jsonFile(`tokens-studio/${slug(resolved.theme.name)}.json`, file)];
}
