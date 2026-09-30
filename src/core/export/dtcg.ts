// ResolvedTheme → W3C Design Tokens (DTCG 2025.10, the first stable format).
//
// Layout (Format + Resolver modules, both Final CG Reports, 2025-10-28):
//   tokens/base.tokens.json      scales, radius, type, shadows, component sizes
//   tokens/light.tokens.json     semantic colours for light mode
//   tokens/dark.tokens.json      semantic colours for dark mode
//   tokens/thevio.resolver.json  base + a `theme` modifier (light | dark)
// Semantic colours that sit exactly on a scale step are references
// (`{palette.brand.600}`), so the system's structure survives the export.
//
// Colours are OKLCH with a gamut-mapped sRGB hex fallback. Hue is written as
// 0 for greys, never "none": Terrazzo's linter rejects "none".

import { formatHex, type Oklch, oklch } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import { STEPS } from "../color/scale";
import {
  MODES,
  type Mode,
  RADIUS_SCALE,
  type ResolvedTheme,
  SHADOW_SIZES,
  type ShadowLayer,
} from "../theme/resolve";
import { matchStylePreset } from "../theme/style-presets";
import { COLOR_TOKENS } from "../theme/tokens";
import {
  COLOR_DESCRIPTIONS,
  COMPONENT_COLOR_DESCRIPTIONS,
  SEMANTIC_DESCRIPTIONS,
} from "./describe";
import {
  type ExportFile,
  fontFamilies,
  jsonFile,
  kebab,
  lookupScale,
  parseCssLength,
  scaleIndex,
  scalesOf,
  studioLink,
} from "./format";

export const DTCG_FORMAT_SCHEMA =
  "https://www.designtokens.org/schemas/2025.10/format.json";
export const DTCG_RESOLVER_SCHEMA =
  "https://www.designtokens.org/schemas/2025.10/resolver.json";
/** DTCG's registered media type. */
const TOKENS_TYPE = "application/design-tokens+json";
const EXTENSION = "app.thevio";

const round = (value: number, digits: number) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

export type DtcgColor = {
  colorSpace: "oklch";
  components: [number, number, number];
  alpha?: number;
  hex: string;
};

export function dtcgColor(color: Oklch): DtcgColor {
  const l = round(Math.min(1, Math.max(0, color.l)), 4);
  const c = round(Math.max(0, color.c), 4);
  const h = c === 0 ? 0 : round(color.h, 2) % 360;
  const alpha = color.alpha ?? 1;
  return {
    colorSpace: "oklch",
    components: [l, c, h],
    ...(alpha < 1 && { alpha: round(alpha, 3) }),
    hex: formatHex(mapToGamut(oklch(color.l, color.c, color.h))),
  };
}

const dimension = (value: number, unit: "px" | "rem") => ({
  value: round(value, 4),
  unit,
});

const shadowValue = (layers: readonly ShadowLayer[]) =>
  layers.map((layer) => ({
    color: dtcgColor(layer.color),
    offsetX: dimension(layer.x, "px"),
    offsetY: dimension(layer.y, "px"),
    blur: dimension(Math.max(0, layer.blur), "px"),
    spread: dimension(layer.spread, "px"),
  }));

/** `--tv-*` component vars as DTCG names (`--tv-control-h` → `control-height`). */
const COMPONENT_SIZES: Record<string, [name: string, description: string]> = {
  "--tv-control-h": ["control-height", "Height of buttons, inputs, selects."],
  "--tv-pad-x": ["padding-x", "Horizontal padding inside controls."],
  "--tv-gap": ["gap", "Gap between related controls."],
  "--tv-card-pad": ["card-padding", "Padding inside cards."],
  "--tv-row-h": ["row-height", "Table row height."],
  "--tv-text": ["font-size", "Control and body text size."],
  "--tv-btn-radius": ["button-radius", "Corner radius of buttons and badges."],
  "--tv-surface-border": ["surface-border-width", "Card border width."],
  "--tv-ring-width": ["ring-width", "Focus ring width."],
  "--tv-ring-offset": ["ring-offset", "Focus ring offset."],
};

function baseTokens(resolved: ResolvedTheme) {
  const { components, fonts } = resolved;
  // Scales live apart from `color`, where the semantic `secondary` token
  // would otherwise collide with the `secondary` scale group.
  const palette: Record<string, unknown> = {
    $type: "color",
    $description: "50–950 scales. Semantic colours reference these.",
  };
  for (const [name, scale] of scalesOf(resolved)) {
    palette[name] = Object.fromEntries(
      STEPS.map((step) => [String(step), { $value: dtcgColor(scale[step]) }]),
    );
  }

  const radius: Record<string, unknown> = {
    $type: "dimension",
    base: {
      $value: dimension(resolved.radius.base, "rem"),
      $description: "The base corner radius; the scale multiplies it.",
    },
  };
  for (const size of Object.keys(
    RADIUS_SCALE,
  ) as (keyof typeof RADIUS_SCALE)[]) {
    radius[size] = { $value: dimension(resolved.radius[size], "rem") };
  }

  const component: Record<string, unknown> = {
    $description:
      "Component style. Sizes are tokens; the style choices are in $extensions.",
    $extensions: {
      [EXTENSION]: {
        style: components.tokens,
        preset: matchStylePreset(components.tokens),
      },
    },
  };
  for (const [cssName, value] of Object.entries(components.vars)) {
    const entry = COMPONENT_SIZES[cssName];
    const length = parseCssLength(value);
    if (!entry || !length) continue;
    const [name, description] = entry;
    component[name] = {
      $type: "dimension",
      $value: dimension(length.value, length.unit),
      $description: description,
    };
  }
  if (components.vars["--tv-surface-shadow"]?.includes("--shadow-sm")) {
    component["surface-shadow"] = {
      $type: "shadow",
      $value: "{shadow.sm}",
      $description: "Card elevation.",
    };
  }
  component["hover-shift"] = {
    $type: "number",
    $value: resolved.theme.states.hoverShift,
    $description: "How far hover mixes a fill toward the foreground (0-1).",
  };

  return {
    $schema: DTCG_FORMAT_SCHEMA,
    $description: `Thevio theme "${resolved.theme.name}": primitives and mode-independent tokens. Mode colours are in light/dark.tokens.json; thevio.resolver.json combines them.`,
    $extensions: { [EXTENSION]: { link: studioLink(resolved), version: 1 } },
    palette,
    radius,
    spacing: {
      $type: "dimension",
      $value: dimension(resolved.spacing, "rem"),
      $description: "Tailwind v4 spacing unit (--spacing).",
    },
    "border-width": {
      $type: "dimension",
      $value: dimension(resolved.borderWidth, "px"),
    },
    font: {
      $type: "fontFamily",
      sans: { $value: fontFamilies(fonts.sans, "sans") },
      mono: { $value: fontFamilies(fonts.mono, "mono") },
      heading: { $value: fontFamilies(fonts.heading, "sans") },
    },
    "letter-spacing": {
      $type: "number",
      $value: resolved.letterSpacing,
      $description: "Letter spacing in em (DTCG dimensions have no em unit).",
      $extensions: { [EXTENSION]: { unit: "em" } },
    },
    shadow: {
      $type: "shadow",
      ...Object.fromEntries(
        SHADOW_SIZES.map((size) => [
          size,
          { $value: shadowValue(resolved.shadowLayers[size]) },
        ]),
      ),
    },
    component,
  };
}

function modeTokens(resolved: ResolvedTheme, mode: Mode) {
  const index = scaleIndex(resolved);
  const value = (color: Oklch) => {
    const at = lookupScale(index, color);
    return at ? `{palette.${at[0]}.${at[1]}}` : dtcgColor(color);
  };
  const colors = resolved.colors[mode];
  const color: Record<string, unknown> = { $type: "color" };
  for (const token of COLOR_TOKENS) {
    color[token] = {
      $value: value(colors[token]),
      $description: COLOR_DESCRIPTIONS[token],
    };
  }
  for (const [name, c] of Object.entries(resolved.semantic[mode])) {
    color[name] = {
      $value: value(c),
      $description: SEMANTIC_DESCRIPTIONS[name],
    };
  }
  const componentColor: Record<string, unknown> = { $type: "color" };
  for (const [name, c] of Object.entries(resolved.components.colors[mode])) {
    componentColor[kebab(name)] = {
      $value: value(c),
      $description: COMPONENT_COLOR_DESCRIPTIONS[name],
    };
  }
  // No root $description: tools merge the files, and it would collide with
  // base's (Style Dictionary warns).
  return {
    $schema: DTCG_FORMAT_SCHEMA,
    color,
    component: { color: componentColor },
  };
}

function resolver(resolved: ResolvedTheme) {
  return {
    $schema: DTCG_RESOLVER_SCHEMA,
    version: "2025.10",
    name: resolved.theme.name,
    description: "Thevio theme: base tokens plus a light/dark theme modifier.",
    sets: { base: { sources: [{ $ref: "base.tokens.json" }] } },
    modifiers: {
      theme: {
        contexts: Object.fromEntries(
          MODES.map((mode) => [mode, [{ $ref: `${mode}.tokens.json` }]]),
        ),
        default: "light",
      },
    },
    resolutionOrder: [{ $ref: "#/sets/base" }, { $ref: "#/modifiers/theme" }],
  };
}

const README = `# Design tokens (DTCG 2025.10)

- \`base.tokens.json\`: scales, radius, fonts, shadows, component sizes.
- \`light.tokens.json\`, \`dark.tokens.json\`: semantic colours per mode. Many are references into the base scales.
- \`thevio.resolver.json\`: the DTCG Resolver file that combines them (\`theme\`: \`light\` | \`dark\`).

Colours are OKLCH with an sRGB \`hex\` fallback.

## Terrazzo (reads the resolver)

\`\`\`js
// terrazzo.config.mjs → npx tz build
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

export default defineConfig({
  tokens: ["./tokens/thevio.resolver.json"],
  outDir: "./dist/",
  plugins: [
    css({
      filename: "tokens.css",
      permutations: [
        { input: { theme: "light" }, prepare: (css) => \`:root {\\n\${css}\\n}\` },
        { input: { theme: "dark" }, prepare: (css) => \`.dark {\\n\${css}\\n}\` },
      ],
    }),
  ],
});
\`\`\`

## Style Dictionary v5 (one build per mode)

List the transforms explicitly: adding \`color/oklch\` on top of the \`css\` group converts through sRGB first.

\`\`\`js
// sd.config.mjs → node sd.config.mjs
import StyleDictionary from "style-dictionary";

for (const mode of ["light", "dark"]) {
  await new StyleDictionary({
    source: ["tokens/base.tokens.json", \`tokens/\${mode}.tokens.json\`],
    platforms: {
      css: {
        transforms: ["attribute/cti", "name/kebab", "size/rem", "color/oklch", "fontFamily/css", "shadow/css/shorthand"],
        buildPath: "dist/",
        files: [{
          destination: \`\${mode}.css\`,
          format: "css/variables",
          options: { selector: mode === "light" ? ":root" : ".dark", outputReferences: true },
        }],
      },
    },
  }).buildAllPlatforms();
}
\`\`\`
`;

export function toDtcg(resolved: ResolvedTheme): ExportFile[] {
  return [
    jsonFile("tokens/base.tokens.json", baseTokens(resolved), TOKENS_TYPE),
    ...MODES.map((mode) =>
      jsonFile(
        `tokens/${mode}.tokens.json`,
        modeTokens(resolved, mode),
        TOKENS_TYPE,
      ),
    ),
    jsonFile("tokens/thevio.resolver.json", resolver(resolved)),
    { path: "tokens/README.md", contents: README, type: "text/markdown" },
  ];
}
