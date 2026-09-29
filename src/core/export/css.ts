// ResolvedTheme → a shadcn-style globals.css block for Tailwind v4:
// `:root` and `.dark` variables, then `@theme inline` so utilities use them.

import type { ResolvedTheme } from "../theme/resolve";
import { RADIUS_SCALE, SHADOW_SIZES } from "../theme/resolve";
import { COLOR_TOKENS } from "../theme/tokens";
import { header, modeVars, sharedVars } from "./format";

const block = (selector: string, vars: [string, string][]) =>
  `${selector} {\n${vars.map(([name, value]) => `  --${name}: ${value};`).join("\n")}\n}`;

function themeInline(resolved: ResolvedTheme): string {
  const semantic = Object.keys(resolved.semantic.light);
  const lines = [
    ...[...COLOR_TOKENS, ...semantic].map(
      (token) => `  --color-${token}: var(--${token});`,
    ),
    "  --font-sans: var(--font-sans);",
    "  --font-mono: var(--font-mono);",
    "  --font-heading: var(--font-heading);",
    ...Object.entries(RADIUS_SCALE).map(([size, factor]) =>
      factor === 1
        ? `  --radius-${size}: var(--radius);`
        : `  --radius-${size}: calc(var(--radius) * ${factor});`,
    ),
    ...SHADOW_SIZES.map((size) => `  --shadow-${size}: var(--shadow-${size});`),
  ];
  return `@theme inline {\n${lines.join("\n")}\n}`;
}

function componentNote(resolved: ResolvedTheme): string {
  const tokens = Object.entries(resolved.components.tokens)
    .map(([name, value]) => ` *   ${name}: ${value}`)
    .join("\n");
  return `/*\n * Component style (the --tv-* variables encode it):\n${tokens}\n */`;
}

/** `globals.css` for a shadcn + Tailwind v4 app. */
export function toCss(resolved: ResolvedTheme): string {
  return [
    `/* ${header(resolved, "globals.css")} */`,
    componentNote(resolved),
    block(":root", [...sharedVars(resolved), ...modeVars(resolved, "light")]),
    block(".dark", modeVars(resolved, "dark")),
    themeInline(resolved),
  ].join("\n\n");
}
