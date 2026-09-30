// ResolvedTheme → DESIGN.md: the theme as instructions for AI coding tools.
//
// Format: Google's DESIGN.md (github.com/google-labs-code/design.md, alpha,
// Apache-2.0), which Stitch imports and `npx @google/design.md lint` checks.
// YAML front matter holds the normative tokens (light mode, hex); the
// sections below give intent, dark mode, contrast and exact classes.
//
// What makes models follow such files (Anthropic, Builder.io, Cursor docs):
// checkable rules, lookups instead of invention, exact class names, short.
// So every statement here is computed from the theme: the style choices
// become concrete class changes against stock shadcn/ui components, and the
// contrast table shows measured ratios, not promises.

import { formatHex, formatOklch, type Oklch } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import { contrastRatio, WCAG } from "../contrast/wcag";
import {
  type ComponentColors,
  MODES,
  type Mode,
  RADIUS_SCALE,
  type ResolvedTheme,
} from "../theme/resolve";
import { fromColorValue } from "../theme/schema";
import { matchStylePreset } from "../theme/style-presets";
import { COLOR_TOKENS } from "../theme/tokens";
import {
  COLOR_DESCRIPTIONS,
  COMPONENT_COLOR_DESCRIPTIONS,
  SEMANTIC_DESCRIPTIONS,
} from "./describe";
import { type ExportFile, kebab, studioLink } from "./format";

const hex = (color: Oklch) => formatHex(mapToGamut(color));
/** `#rrggbb`, or `#rrggbbaa` for translucent tokens (dark borders). */
const hexAlpha = (color: Oklch) => {
  const alpha = color.alpha ?? 1;
  return alpha >= 1
    ? hex(color)
    : `${hex(color)}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`;
};
const round = (value: number, digits = 2) =>
  Math.round(value * 10 ** digits) / 10 ** digits;
const pxOf = (rem: number) => `${round(rem * 16)}px`;

// ---------------------------------------------------------------------------
// Words for colours, so the overview reads like a designer wrote it.

/** Tailwind v4 palette hues in OKLCH, as named anchors. */
const HUES: readonly [number, string][] = [
  [16, "rose"],
  [25, "red"],
  [47, "orange"],
  [70, "amber"],
  [95, "yellow"],
  [130, "lime"],
  [150, "green"],
  [163, "emerald"],
  [182, "teal"],
  [215, "cyan"],
  [237, "sky blue"],
  [260, "blue"],
  [277, "indigo"],
  [293, "violet"],
  [304, "purple"],
  [322, "fuchsia"],
  [354, "pink"],
];

export function hueName(h: number): string {
  let best = HUES[0];
  let bestDistance = 360;
  for (const entry of HUES) {
    const d = Math.abs(((h - entry[0] + 540) % 360) - 180);
    if (d < bestDistance) {
      best = entry;
      bestDistance = d;
    }
  }
  return best?.[1] ?? "blue";
}

export function describeColor(color: Oklch): string {
  if (color.c < 0.02) {
    return color.l > 0.9
      ? "near-white"
      : color.l < 0.25
        ? "near-black"
        : "grey";
  }
  const tone =
    color.l > 0.85
      ? "pale "
      : color.l < 0.4
        ? "deep "
        : color.c > 0.18
          ? "vivid "
          : color.c < 0.08
            ? "muted "
            : "";
  return `${tone}${hueName(color.h)}`;
}

// ---------------------------------------------------------------------------
// Tailwind class helpers

/** `h-9` when the size is a whole (or half) spacing step, else `h-[2.3rem]`. */
function sizeClass(prefix: string, rem: number, spacing: number): string {
  const steps = rem / spacing;
  const snapped = Math.round(steps * 2) / 2;
  return Math.abs(steps - snapped) < 1e-6
    ? `${prefix}-${snapped}`
    : `${prefix}-[${round(rem, 4)}rem]`;
}

const remOf = (value: string | undefined) =>
  Number.parseFloat(value ?? "0") || 0;

// ---------------------------------------------------------------------------
// Front matter (YAML subset: nested maps of strings and numbers)

type Yaml = string | number | { readonly [key: string]: Yaml };

// JSON strings are valid YAML scalars; bare words need no quotes.
const scalar = (value: string | number) =>
  typeof value === "number" ||
  (/^[a-z][\w-]*$/i.test(value) &&
    // YAML 1.1 reads these as booleans or null.
    !/^(?:y|n|yes|no|on|off|true|false|null)$/i.test(value))
    ? String(value)
    : JSON.stringify(value);

/** Block style, with maps of scalars on one line (flow style) to stay short. */
function yaml(value: { readonly [key: string]: Yaml }, indent = ""): string {
  return Object.entries(value)
    .map(([key, entry]) => {
      if (typeof entry !== "object") return `${indent}${key}: ${scalar(entry)}`;
      const values = Object.values(entry);
      if (indent && values.every((v) => typeof v !== "object")) {
        const pairs = Object.entries(entry).map(
          ([k, v]) => `${k}: ${scalar(v as string | number)}`,
        );
        return `${indent}${key}: { ${pairs.join(", ")} }`;
      }
      return `${indent}${key}:\n${yaml(entry, `${indent}  `)}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------

type Ctx = {
  resolved: ResolvedTheme;
  name: string;
  tokens: ResolvedTheme["components"]["tokens"];
  vars: ResolvedTheme["components"]["vars"];
  spacing: number;
};

function frontMatter({ resolved, name, tokens, vars }: Ctx): string {
  const light = resolved.colors.light;
  const component = resolved.components.colors.light;
  const colors: Record<string, string> = {};
  for (const token of COLOR_TOKENS) colors[token] = hex(light[token]);
  for (const [token, color] of Object.entries(resolved.semantic.light)) {
    colors[token] = hex(color);
  }
  for (const [key, color] of Object.entries(component)) {
    colors[`tv-${kebab(key)}`] = hex(color);
  }

  const { fonts, letterSpacing } = resolved;
  const tracking = (em: number) => `${round(em + letterSpacing, 3)}em`;
  const type = (
    fontFamily: string,
    fontSize: string,
    fontWeight: number,
    lineHeight: number,
    letter = 0,
  ) => ({
    fontFamily,
    fontSize,
    fontWeight,
    lineHeight,
    letterSpacing: tracking(letter),
  });

  const rounded: Record<string, string> = {};
  for (const size of Object.keys(
    RADIUS_SCALE,
  ) as (keyof typeof RADIUS_SCALE)[]) {
    rounded[size] = pxOf(resolved.radius[size]);
  }
  const buttonRadius = vars["--tv-btn-radius"] ?? "0";
  rounded.button = buttonRadius.endsWith("rem")
    ? pxOf(remOf(buttonRadius))
    : buttonRadius;
  rounded.full = "9999px";

  const control = pxOf(remOf(vars["--tv-control-h"]));
  const padX = pxOf(remOf(vars["--tv-pad-x"]));
  const primaryButton = {
    solid: { bg: "{colors.primary}", fg: "{colors.primary-foreground}" },
    soft: { bg: "{colors.tv-soft-bg}", fg: "{colors.tv-soft-fg}" },
    outline: { bg: "{colors.background}", fg: "{colors.tv-primary-text}" },
  }[tokens.buttonStyle];
  const field =
    tokens.inputStyle === "filled"
      ? "{colors.tv-field}"
      : "{colors.background}";
  const activeTab =
    tokens.tabStyle === "pill"
      ? { bg: "{colors.tv-soft-bg}", fg: "{colors.tv-soft-fg}" }
      : { bg: "{colors.background}", fg: "{colors.foreground}" };

  const data = {
    version: "alpha",
    name,
    description: overviewSentence(resolved),
    colors,
    typography: {
      display: type(fonts.heading, "48px", 700, 1, -0.025),
      headline: type(fonts.heading, "30px", 600, 1.2, -0.025),
      title: type(fonts.heading, "20px", 600, 1.4),
      body: type(fonts.sans, "16px", 400, 1.5),
      "body-sm": type(fonts.sans, "14px", 400, 1.43),
      label: type(fonts.sans, "14px", 500, 1.43),
      code: type(fonts.mono, "14px", 400, 1.5),
    },
    rounded,
    spacing: {
      unit: pxOf(resolved.spacing),
      "control-height": control,
      "control-padding-x": padX,
      gap: pxOf(remOf(vars["--tv-gap"])),
      "card-padding": pxOf(remOf(vars["--tv-card-pad"])),
      "row-height": pxOf(remOf(vars["--tv-row-h"])),
    },
    components: {
      "button-primary": {
        backgroundColor: primaryButton.bg,
        textColor: primaryButton.fg,
        typography: "{typography.label}",
        rounded: "{rounded.button}",
        height: control,
        padding: `0 ${padX}`,
      },
      "button-secondary": {
        backgroundColor: "{colors.secondary}",
        textColor: "{colors.secondary-foreground}",
        typography: "{typography.label}",
        rounded: "{rounded.button}",
        height: control,
        padding: `0 ${padX}`,
      },
      "button-destructive": {
        backgroundColor: "{colors.destructive}",
        textColor: "{colors.destructive-foreground}",
        rounded: "{rounded.button}",
        height: control,
      },
      input: {
        backgroundColor: field,
        textColor: "{colors.foreground}",
        typography: "{typography.body-sm}",
        rounded: tokens.inputStyle === "underline" ? "0px" : "{rounded.md}",
        height: control,
      },
      card: {
        backgroundColor:
          tokens.surfaceStyle === "flat" ? "{colors.muted}" : "{colors.card}",
        textColor: "{colors.card-foreground}",
        rounded: "{rounded.xl}",
        padding: pxOf(remOf(vars["--tv-card-pad"])),
      },
      "tab-active": {
        backgroundColor: activeTab.bg,
        textColor: activeTab.fg,
        typography: "{typography.label}",
      },
      badge: {
        backgroundColor: "{colors.secondary}",
        textColor: "{colors.secondary-foreground}",
        rounded: "{rounded.button}",
      },
    },
  } satisfies Record<string, Yaml>;
  return `---\n${yaml(data)}\n---`;
}

function overviewSentence(resolved: ResolvedTheme): string {
  const { tokens } = resolved.components;
  const brand = resolved.colors.light.primary;
  return `${describeColor(brand)} brand, ${tokens.buttonShape === "pill" ? "pill-shaped" : tokens.buttonShape === "square" ? "square-cornered" : "rounded"} ${tokens.buttonStyle} buttons, ${tokens.inputStyle} inputs, ${tokens.density} density; light and dark modes.`.replace(
    /^./,
    (ch) => ch.toUpperCase(),
  );
}

// ---------------------------------------------------------------------------
// Sections

const SURFACE_WORDS = {
  border: (w: string) =>
    `Cards and panels have a ${w} \`border-border\` edge and no shadow.`,
  shadow: () =>
    "Cards and panels have no border: they float on `shadow-md` plus a hairline `ring-1 ring-foreground/5`.",
  both: (w: string) =>
    `Cards and panels have a ${w} \`border-border\` edge and a \`shadow-sm\`.`,
  flat: () =>
    "Cards and panels are flat: no border, no shadow, a `bg-muted` fill separates them.",
} as const;

/** Card classes on top of stock shadcn's `border`; null keeps stock. */
const CARD_CLASSES = {
  border: null,
  shadow: "border-0 shadow-md ring-1 ring-foreground/5",
  both: "shadow-sm",
  flat: "border-0 shadow-none bg-muted",
} as const;

const FOCUS_WORDS = {
  ring: "a 3px halo: `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50` (stock shadcn)",
  outline:
    "an offset outline: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:ring-0`",
  glow: "a solid ring with a soft bloom: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-[0_0_16px_4px_color-mix(in_oklch,var(--ring)_35%,transparent)]`",
} as const;

function overview({ resolved, name, tokens }: Ctx): string {
  const { colors, fonts, theme } = resolved;
  const brand = colors.light.primary;
  const neutral =
    theme.colors.neutral.chroma < 0.004
      ? "pure neutral greys"
      : `greys tinted toward ${hueName(theme.colors.neutral.hue)}`;
  const preset = matchStylePreset(tokens);
  const secondary = resolved.scales.secondary
    ? ` A ${describeColor(resolved.scales.secondary[500])} secondary tints the subtle fills.`
    : "";
  const type =
    fonts.heading === fonts.sans
      ? `Type is ${fonts.sans} throughout, with ${fonts.mono} for code.`
      : `Headings are set in ${fonts.heading}, text in ${fonts.sans}, code in ${fonts.mono}.`;
  return `## Overview

${name} is a shadcn/ui + Tailwind CSS v4 theme with light and dark modes. The brand is a ${describeColor(brand)} (\`${hex(brand)}\`) on ${neutral}.${secondary} ${type}

Component style${preset ? ` (Thevio's "${preset}" preset)` : ""}: ${tokens.buttonShape === "pill" ? "pill-shaped" : tokens.buttonShape === "square" ? "square-cornered" : "rounded"} ${tokens.buttonStyle} primary buttons, ${tokens.inputStyle} inputs, ${tokens.surfaceStyle === "flat" ? "flat" : tokens.surfaceStyle === "shadow" ? "shadowed, borderless" : tokens.surfaceStyle === "both" ? "bordered and shadowed" : "bordered"} cards, ${tokens.tabStyle} tabs, ${tokens.density} density, ${tokens.focusRing} focus.

Every colour is a CSS variable with a light (\`:root\`) and a dark (\`.dark\`) value, exposed as Tailwind utilities (\`bg-primary\`, \`text-muted-foreground\`). The values are normative: change the theme at the source link below, not in components.`;
}

function colorsSection({ resolved }: Ctx): string {
  const rows: string[] = [];
  const row = (token: string, light: Oklch, dark: Oklch, use: string) =>
    rows.push(
      `| \`${token}\` | \`${hexAlpha(light)}\` · \`${formatOklch(light)}\` | \`${hexAlpha(dark)}\` · \`${formatOklch(dark)}\` | ${use} |`,
    );
  for (const token of COLOR_TOKENS) {
    row(
      token,
      resolved.colors.light[token],
      resolved.colors.dark[token],
      COLOR_DESCRIPTIONS[token],
    );
  }
  for (const token of Object.keys(resolved.semantic.light)) {
    const key = token as keyof ResolvedTheme["semantic"]["light"];
    row(
      token,
      resolved.semantic.light[key],
      resolved.semantic.dark[key],
      SEMANTIC_DESCRIPTIONS[token] ?? "",
    );
  }
  for (const key of Object.keys(
    resolved.components.colors.light,
  ) as (keyof ComponentColors)[]) {
    row(
      `tv-${kebab(key)}`,
      resolved.components.colors.light[key],
      resolved.components.colors.dark[key],
      COMPONENT_COLOR_DESCRIPTIONS[key] ?? "",
    );
  }

  return `## Colors

Use a token as \`bg-{token}\`, \`text-{token}\`, \`border-{token}\` (or \`var(--{token})\` in CSS). Each surface token pairs with its \`-foreground\`: put \`text-primary-foreground\` on \`bg-primary\`, \`text-card-foreground\` on \`bg-card\`.

| Token | Light | Dark | Use |
|---|---|---|---|
${rows.join("\n")}

Contrast, measured (WCAG 2.2: text ≥ ${WCAG.text}:1, UI parts ≥ ${WCAG.ui}:1):

${contrastTable(resolved)}`;
}

function contrastTable(resolved: ResolvedTheme): string {
  type Pair = [
    label: string,
    min: number,
    pick: (mode: Mode) => [Oklch, Oklch],
  ];
  const c = (mode: Mode) => resolved.colors[mode];
  const k = (mode: Mode) => resolved.components.colors[mode];
  const pairs: Pair[] = [
    [
      "`foreground` on `background`",
      WCAG.text,
      (m) => [c(m).foreground, c(m).background],
    ],
    [
      "`muted-foreground` on `background`",
      WCAG.text,
      (m) => [c(m)["muted-foreground"], c(m).background],
    ],
    [
      "`muted-foreground` on `muted`",
      WCAG.text,
      (m) => [c(m)["muted-foreground"], c(m).muted],
    ],
    [
      "`primary-foreground` on `primary`",
      WCAG.text,
      (m) => [c(m)["primary-foreground"], c(m).primary],
    ],
    [
      "`secondary-foreground` on `secondary`",
      WCAG.text,
      (m) => [c(m)["secondary-foreground"], c(m).secondary],
    ],
    [
      "`tv-soft-fg` on `tv-soft-bg`",
      WCAG.text,
      (m) => [k(m).softFg, k(m).softBg],
    ],
    [
      "`tv-primary-text` on `background`",
      WCAG.text,
      (m) => [k(m).primaryText, c(m).background],
    ],
    [
      "`primary` on `background` (fill edge)",
      WCAG.ui,
      (m) => [c(m).primary, c(m).background],
    ],
    ["`ring` on `background`", WCAG.ui, (m) => [c(m).ring, c(m).background]],
    ["`tv-line` on `background`", WCAG.ui, (m) => [k(m).line, c(m).background]],
  ];
  const cell = (fg: Oklch, bg: Oklch, min: number) => {
    const ratio = contrastRatio(fg, bg);
    return `${ratio.toFixed(2)}:1 ${ratio >= min ? "✓" : "✗"}`;
  };
  const lines = pairs.map(([label, min, pick]) => {
    const cells = MODES.map((mode) => cell(...pick(mode), min));
    return `| ${label} | ${cells.join(" | ")} |`;
  });
  return ["| Pair | Light | Dark |", "|---|---|---|", ...lines].join("\n");
}

function typography({ resolved }: Ctx): string {
  const { fonts, letterSpacing } = resolved;
  const families = [...new Set([fonts.sans, fonts.heading, fonts.mono])];
  return `## Typography

- \`font-sans\`: ${fonts.sans}, for all UI and body text.
- \`font-heading\`: ${fonts.heading}, for h1–h3 and display text.
- \`font-mono\`: ${fonts.mono}, for code and tabular figures.
- Load ${families.join(", ")} from Google Fonts (\`next/font/google\` in Next.js).${letterSpacing !== 0 ? `\n- Base letter spacing is ${letterSpacing}em (\`tracking-normal\`); keep it on body text.` : ""}

| Role | Classes |
|---|---|
| Display | \`font-heading text-5xl font-bold tracking-tight\` |
| Headline | \`font-heading text-3xl font-semibold tracking-tight\` |
| Title | \`font-heading text-xl font-semibold\` |
| Body | \`text-base\` |
| Small / UI | \`text-sm\` |
| Label | \`text-sm font-medium\` |
| Caption | \`text-xs text-muted-foreground\` |`;
}

function layout({ tokens, vars, spacing }: Ctx): string {
  const control = remOf(vars["--tv-control-h"]);
  return `## Layout

Density is **${tokens.density}**. Spacing unit \`--spacing\` = ${pxOf(spacing)}.

| Measure | Value | Class |
|---|---|---|
| Control height (button, input, select) | ${pxOf(control)} | \`${sizeClass("h", control, spacing)}\` |
| Control padding | ${pxOf(remOf(vars["--tv-pad-x"]))} | \`${sizeClass("px", remOf(vars["--tv-pad-x"]), spacing)}\` |
| Gap between controls | ${pxOf(remOf(vars["--tv-gap"]))} | \`${sizeClass("gap", remOf(vars["--tv-gap"]), spacing)}\` |
| Card padding | ${pxOf(remOf(vars["--tv-card-pad"]))} | \`${sizeClass("p", remOf(vars["--tv-card-pad"]), spacing)}\` |
| Table row height | ${pxOf(remOf(vars["--tv-row-h"]))} | \`${sizeClass("h", remOf(vars["--tv-row-h"]), spacing)}\` |`;
}

function elevation({ resolved, tokens }: Ctx): string {
  const width = `${resolved.borderWidth}px`;
  const { shadow } = resolved.theme;
  return `## Elevation & Depth

${SURFACE_WORDS[tokens.surfaceStyle](width)} Popovers, menus and dialogs always keep a border and \`shadow-lg\`, in every style.

The shadow scale (\`shadow-2xs\` … \`shadow-2xl\`) grows from one base shadow, ${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px at ${Math.round(shadow.opacity * 100)}% opacity${shadow.color ? ` of \`${hex(fromColorValue(shadow.color))}\`` : ""}. \`shadow-sm\` is \`${resolved.shadows.sm}\`.

In dark mode, surfaces get lighter as they rise (\`background\` → \`card\` → \`popover\`); borders are white overlays. Don't add \`dark:\` colour overrides: the variables already switch.`;
}

function shapes({ resolved, tokens }: Ctx): string {
  const button = {
    square: "`rounded-xs` (2px)",
    rounded: `\`rounded-lg\` (${pxOf(resolved.radius.base)})`,
    pill: "`rounded-full`",
  }[tokens.buttonShape];
  return `## Shapes

\`--radius\` = ${pxOf(resolved.radius.base)}. Scale: ${(
    Object.keys(RADIUS_SCALE) as (keyof typeof RADIUS_SCALE)[]
  )
    .map((size) => `\`rounded-${size}\` ${pxOf(resolved.radius[size])}`)
    .join(", ")}.

- Buttons and badges: ${button}.
- Inputs and selects: ${tokens.inputStyle === "underline" ? "`rounded-none` (underline style)" : "`rounded-md`"}.
- Cards: \`rounded-xl\`. Popovers and menus: \`rounded-lg\`.`;
}

function components(ctx: Ctx): string {
  const { tokens, vars, spacing, resolved } = ctx;
  const h = sizeClass("h", remOf(vars["--tv-control-h"]), spacing);
  const px = sizeClass("px", remOf(vars["--tv-pad-x"]), spacing);
  const shape = {
    square: "rounded-xs",
    rounded: "rounded-lg",
    pill: "rounded-full",
  }[tokens.buttonShape];

  const primary = {
    solid: "`bg-primary text-primary-foreground hover:bg-primary/90` (stock)",
    soft: "`bg-tv-soft-bg text-tv-soft-fg hover:bg-tv-soft-bg/80`: a soft tint, not a solid fill",
    outline:
      "`border border-primary bg-transparent text-tv-primary-text hover:bg-primary/10`",
  }[tokens.buttonStyle];

  const input = {
    outline: "`border border-input bg-transparent` (stock)",
    filled:
      "`border-0 border-b border-tv-line bg-tv-field` (a filled well with a bottom line)",
    underline:
      "`rounded-none border-0 border-b border-tv-line bg-transparent px-0`; on focus `focus-visible:border-ring focus-visible:shadow-[inset_0_-1px_0_var(--ring)] focus-visible:ring-0`",
  }[tokens.inputStyle];

  const cardClasses = CARD_CLASSES[tokens.surfaceStyle];
  const card = cardClasses ? `\`${cardClasses}\`` : "`border` (stock)";
  const cardOpen = cardClasses ? `<Card className="${cardClasses}">` : "<Card>";

  const tabs = {
    segmented:
      "stock shadcn: a `bg-muted` track; the active trigger is `bg-background shadow-sm`",
    pill: "list `bg-transparent gap-1 p-0`; triggers `rounded-full`; the active one `bg-tv-soft-bg text-tv-soft-fg shadow-none`",
    underline:
      "list `bg-transparent rounded-none p-0 gap-5 border-b`; triggers `rounded-none px-0`; the active one `bg-transparent shadow-[inset_0_-2px_0_var(--primary)]`",
  }[tokens.tabStyle];

  const adjusted = MODES.filter(
    (mode) =>
      formatOklch(resolved.components.colors[mode].primaryText) !==
      formatOklch(resolved.colors[mode].primary),
  );
  const linkText =
    adjusted.length > 0
      ? `Links and primary-coloured text: \`text-tv-primary-text\`, not \`text-primary\` (as text, primary is under 4.5:1 in ${adjusted.join(" and ")} mode; this token is the passing shade).`
      : "Links and primary-coloured text: `text-primary` passes 4.5:1 in both modes.";

  return `## Components

Built on shadcn/ui. Differences from the stock components (\`components/ui/*\`):

- **Button** sizes: default \`${h} ${px}\`; shape \`${shape}\` on every variant (replace \`rounded-md\`).
- **Primary button** (default variant): ${primary}. Secondary, ghost and destructive keep their stock colours.
- **Input, Textarea, Select trigger**: \`${h}\`, ${input}.
- **Card**: ${card}, \`rounded-xl\`, padding \`${sizeClass("p", remOf(vars["--tv-card-pad"]), spacing)}\`.
- **Tabs**: ${tabs}.
- **Focus** (all interactive parts): ${FOCUS_WORDS[tokens.focusRing]}.
- ${linkText}
- **Charts**: series colours \`chart-1\` … \`chart-5\`, in order.
- **Status**: \`bg-success text-success-foreground\`, \`warning\`, \`info\` likewise; errors use \`destructive\`.

\`\`\`tsx
${cardOpen}
  <CardHeader>
    <CardTitle className="font-heading">Invite your team</CardTitle>
    <CardDescription>They'll get an email with a link.</CardDescription>
  </CardHeader>
  <CardContent className="flex ${sizeClass("gap", remOf(vars["--tv-gap"]), spacing)}">
    <Input placeholder="name@company.com" />
    <Button>Send invite</Button>
  </CardContent>
</Card>
\`\`\``;
}

function dosAndDonts({ tokens }: Ctx): string {
  const shape = {
    square: "rounded-xs",
    rounded: "rounded-lg",
    pill: "rounded-full",
  }[tokens.buttonShape];
  const donts = [
    "Don't hardcode colours (`#hex`, `oklch()`, `bg-blue-500`, `text-gray-600`): use the tokens above, so dark mode and re-theming keep working.",
    "Don't add `dark:` colour variants: every token already has a dark value.",
    `Don't give buttons \`rounded-md\`; they are \`${shape}\`.`,
    tokens.surfaceStyle === "border"
      ? "Don't put shadows on cards; the border is the edge."
      : tokens.surfaceStyle === "shadow"
        ? "Don't put borders on cards; elevation is the edge."
        : tokens.surfaceStyle === "flat"
          ? "Don't put borders or shadows on cards."
          : "Don't drop either the border or the shadow on cards.",
    "Don't put `text-muted-foreground` on coloured fills; it is measured against `background`, `card` and `muted` only.",
  ];
  const dos = [
    "Pair every surface with its foreground token.",
    "Use `font-heading` for headings, `font-sans` elsewhere.",
    "Check both modes: toggle the `.dark` class on `<html>`.",
  ];
  return `## Do's and Don'ts

${[...dos.map((line) => `- Do: ${line}`), ...donts.map((line) => `- ${line}`)].join("\n")}`;
}

function promptGuide({ name, resolved, tokens }: Ctx): string {
  return `## Agent Prompt Guide

Paste this when asking an AI tool for UI:

> Build it with shadcn/ui and Tailwind CSS v4, following DESIGN.md (theme "${name}"): ${describeColor(resolved.colors.light.primary)} brand, ${tokens.buttonShape} ${tokens.buttonStyle} buttons, ${tokens.inputStyle} inputs, ${tokens.surfaceStyle} cards, ${tokens.density} density. Use only the theme's tokens (\`bg-primary\`, \`text-muted-foreground\`, \`border-border\`…), never raw colours. Support light and dark mode.

## Using this file

- Claude Code: add \`@DESIGN.md\` to \`CLAUDE.md\`.
- Cursor: \`.cursor/rules/design.mdc\` with \`alwaysApply: true\` and the body \`@DESIGN.md\`.
- GitHub Copilot: \`.github/instructions/design.instructions.md\` with \`applyTo: "**/*.{tsx,jsx,css}"\` and the body "Follow DESIGN.md".
- Codex, Jules and other AGENTS.md readers: add "Follow DESIGN.md for all UI." to \`AGENTS.md\`.
- Google Stitch: import this file as the project's design system.

Source: ${studioLink(resolved)}`;
}

export function toDesignMd(resolved: ResolvedTheme): string {
  const ctx: Ctx = {
    resolved,
    name: resolved.theme.name,
    tokens: resolved.components.tokens,
    vars: resolved.components.vars,
    spacing: resolved.spacing,
  };
  const sections = [
    frontMatter(ctx),
    `# ${ctx.name}`,
    overview(ctx),
    colorsSection(ctx),
    typography(ctx),
    layout(ctx),
    elevation(ctx),
    shapes(ctx),
    components(ctx),
    dosAndDonts(ctx),
    promptGuide(ctx),
  ];
  return `${sections.join("\n\n")}\n`;
}

export function toDesignMdFiles(resolved: ResolvedTheme): ExportFile[] {
  return [
    {
      path: "DESIGN.md",
      contents: toDesignMd(resolved),
      type: "text/markdown",
    },
  ];
}
