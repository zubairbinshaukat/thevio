// ResolvedTheme → Figma Variables, for Figma's native DTCG import
// (Variables → a collection → Import mode; Professional plan and up).
//
// Figma's import rules (help.figma.com, "Modes for variables"):
// - each file becomes one mode; a variable is created only if the token is
//   in every file with the same $type, so both files hold the same tree;
// - colours in sRGB (or HSL) only, so OKLCH is converted, with a hex;
// - dimensions in px only; fontFamily a single name; `string` is accepted;
// - shadows and typography have no variable type and are left out.
// Same-file references (`{color.neutral.950}`) import as aliases.

import { formatHex, type Oklch, oklch, toRgb } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import { STEPS } from "../color/scale";
import {
  MODES,
  type Mode,
  RADIUS_SCALE,
  type ResolvedTheme,
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
} from "./format";

const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;
const ROOT_PX = 16;

type Scope =
  | "ALL_SCOPES"
  | "FRAME_FILL"
  | "SHAPE_FILL"
  | "TEXT_FILL"
  | "ALL_FILLS"
  | "STROKE_COLOR"
  | "EFFECT_COLOR"
  | "CORNER_RADIUS"
  | "WIDTH_HEIGHT"
  | "GAP"
  | "STROKE_FLOAT"
  | "FONT_FAMILY"
  | "FONT_SIZE";

const FILL: Scope[] = ["FRAME_FILL", "SHAPE_FILL"];
const TEXT: Scope[] = ["TEXT_FILL", "SHAPE_FILL"];
const STROKE: Scope[] = ["STROKE_COLOR"];

/** Where each colour may be applied, so Figma's pickers stay relevant. */
function colorScopes(name: string): Scope[] {
  if (name.startsWith("chart-")) return ["ALL_FILLS", "STROKE_COLOR"];
  if (/(^|-)ring$/.test(name)) return ["STROKE_COLOR", "EFFECT_COLOR"];
  if (/(^|-)border$|^input$|^line$/.test(name)) return STROKE;
  if (/foreground$|^primary-text$|^soft-fg$/.test(name)) return TEXT;
  return FILL;
}

const extensions = (scopes: Scope[], hidden = false) => ({
  $extensions: {
    "com.figma.scopes": scopes,
    ...(hidden && { "com.figma.hiddenFromPublishing": true }),
  },
});

export function figmaColor(color: Oklch) {
  const opaque = mapToGamut(oklch(color.l, color.c, color.h));
  const { r, g, b } = toRgb(opaque);
  const alpha = color.alpha ?? 1;
  return {
    colorSpace: "srgb",
    components: [round(r, 4), round(g, 4), round(b, 4)],
    alpha: round(alpha, 3),
    hex: formatHex(opaque),
  };
}

const px = (value: number) => ({ value: round(value, 2), unit: "px" });
const remToPx = (rem: number) => px(rem * ROOT_PX);

function modeFile(resolved: ResolvedTheme, mode: Mode) {
  const index = scaleIndex(resolved);
  const value = (color: Oklch) => {
    const at = lookupScale(index, color);
    return at ? `{palette.${at[0]}.${at[1]}}` : figmaColor(color);
  };
  const token = (color: Oklch, name: string, description?: string) => ({
    $type: "color",
    $value: value(color),
    ...(description && { $description: description }),
    ...extensions(colorScopes(name)),
  });

  // Scales apart from `color`: `secondary` is both a scale and a token.
  const palette: Record<string, unknown> = {};
  for (const [name, scale] of scalesOf(resolved)) {
    palette[name] = Object.fromEntries(
      STEPS.map((step) => [
        String(step),
        {
          $type: "color",
          $value: figmaColor(scale[step]),
          ...extensions(["ALL_SCOPES"], true),
        },
      ]),
    );
  }
  const color: Record<string, unknown> = {};
  const colors = resolved.colors[mode];
  for (const name of COLOR_TOKENS) {
    color[name] = token(colors[name], name, COLOR_DESCRIPTIONS[name]);
  }
  for (const [name, c] of Object.entries(resolved.semantic[mode])) {
    color[name] = token(c, name, SEMANTIC_DESCRIPTIONS[name]);
  }

  const component: Record<string, unknown> = {};
  for (const [name, c] of Object.entries(resolved.components.colors[mode])) {
    component[kebab(name)] = token(
      c,
      kebab(name),
      COMPONENT_COLOR_DESCRIPTIONS[name],
    );
  }
  const sizes: Record<string, [string, Scope[]]> = {
    "--tv-control-h": ["control-height", ["WIDTH_HEIGHT"]],
    "--tv-pad-x": ["padding-x", ["GAP"]],
    "--tv-gap": ["gap", ["GAP"]],
    "--tv-card-pad": ["card-padding", ["GAP"]],
    "--tv-row-h": ["row-height", ["WIDTH_HEIGHT"]],
    "--tv-text": ["font-size", ["FONT_SIZE"]],
    "--tv-btn-radius": ["button-radius", ["CORNER_RADIUS"]],
    "--tv-surface-border": ["surface-border-width", ["STROKE_FLOAT"]],
  };
  for (const [cssName, raw] of Object.entries(resolved.components.vars)) {
    const entry = sizes[cssName];
    const length = parseCssLength(raw);
    if (!entry || !length) continue;
    component[entry[0]] = {
      $type: "dimension",
      $value: length.unit === "rem" ? remToPx(length.value) : px(length.value),
      ...extensions(entry[1]),
    };
  }
  // The style choices, as strings designers can read (and bind in prototypes).
  for (const [name, choice] of Object.entries(resolved.components.tokens)) {
    component[kebab(name)] = {
      $type: "string",
      $value: choice,
      ...extensions(["ALL_SCOPES"], true),
    };
  }

  const radius: Record<string, unknown> = {
    base: {
      $type: "dimension",
      $value: remToPx(resolved.radius.base),
      ...extensions(["CORNER_RADIUS"]),
    },
  };
  for (const size of Object.keys(
    RADIUS_SCALE,
  ) as (keyof typeof RADIUS_SCALE)[]) {
    radius[size] = {
      $type: "dimension",
      $value: remToPx(resolved.radius[size]),
      ...extensions(["CORNER_RADIUS"]),
    };
  }

  const font = (family: string) => ({
    $type: "fontFamily",
    $value: family,
    ...extensions(["FONT_FAMILY"]),
  });

  return {
    palette,
    color,
    radius,
    spacing: {
      $type: "dimension",
      $value: remToPx(resolved.spacing),
      $description: "Spacing unit: multiply for gaps and padding.",
      ...extensions(["GAP", "WIDTH_HEIGHT"]),
    },
    "border-width": {
      $type: "dimension",
      $value: px(resolved.borderWidth),
      ...extensions(["STROKE_FLOAT"]),
    },
    font: {
      sans: font(resolved.fonts.sans),
      mono: font(resolved.fonts.mono),
      heading: font(resolved.fonts.heading),
    },
    component,
  };
}

const README = `# Figma Variables

Figma's native import (Professional plan and up):

1. Open the Variables panel and create a collection, e.g. "Theme".
2. Rename its first mode to Light, right-click it → Import mode → Light.tokens.json.
3. Add a mode named Dark, right-click it → Import mode → Dark.tokens.json.

Both files hold the same variables, so every variable gets a light and a
dark value. Scale colours are hidden from publishing; semantic colours are
scoped (fills, text, strokes) so Figma's pickers only offer the right ones.

Shadows have no variable type in Figma and aren't included; use the
Tokens Studio export for them.
`;

export function toFigma(resolved: ResolvedTheme): ExportFile[] {
  return [
    ...MODES.map((mode) =>
      jsonFile(
        `figma/${mode === "light" ? "Light" : "Dark"}.tokens.json`,
        modeFile(resolved, mode),
        "application/design-tokens+json",
      ),
    ),
    { path: "figma/README.md", contents: README, type: "text/markdown" },
  ];
}
