// ResolvedTheme → a Tailwind v4 `@theme` block with the full 50–950 scales,
// so `bg-brand-500`, `text-neutral-700` etc. work alongside the shadcn tokens.

import { formatHex, formatOklch } from "../color/convert";
import { mapToGamut } from "../color/gamut";
import { type Scale, STEPS } from "../color/scale";
import type { ResolvedTheme } from "../theme/resolve";
import { fontStack, header } from "./format";

function scaleLines(name: string, scale: Scale): string[] {
  return STEPS.map((step) => {
    const color = scale[step];
    return `  --color-${name}-${step}: ${formatOklch(color)}; /* ${formatHex(mapToGamut(color))} */`;
  });
}

/** Tailwind v4 CSS-first config: scales, radius, fonts and shadows. */
export function toTailwind(resolved: ResolvedTheme): string {
  const { scales } = resolved;
  const lines = [
    ...scaleLines("brand", scales.brand),
    ...scaleLines("neutral", scales.neutral),
    ...(scales.secondary ? scaleLines("secondary", scales.secondary) : []),
    `  --radius: ${resolved.radius.base}rem;`,
    `  --font-sans: ${fontStack(resolved.fonts.sans, "sans")};`,
    `  --font-mono: ${fontStack(resolved.fonts.mono, "mono")};`,
    ...Object.entries(resolved.shadows).map(
      ([size, value]) => `  --shadow-${size}: ${value};`,
    ),
  ];
  return `/* ${header(resolved, "Tailwind v4")} */\n@import "tailwindcss";\n\n@theme {\n${lines.join("\n")}\n}`;
}
