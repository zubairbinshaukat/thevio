// ResolvedTheme → SCSS variables: one per token for light, a `-dark` twin for
// dark, and the scales as maps.

import { formatOklch } from "../color/convert";
import { type Scale, STEPS } from "../color/scale";
import type { ResolvedTheme } from "../theme/resolve";
import { header, modeVars, sharedVars } from "./format";

function scaleMap(name: string, scale: Scale): string {
  const entries = STEPS.map(
    (step) => `  ${step}: ${formatOklch(scale[step])},`,
  ).join("\n");
  return `$${name}: (\n${entries}\n);`;
}

export function toScss(resolved: ResolvedTheme): string {
  const vars = (entries: [string, string][], suffix = "") =>
    entries.map(([name, value]) => `$${name}${suffix}: ${value};`).join("\n");
  const { scales } = resolved;
  return [
    `// ${header(resolved, "SCSS")}`,
    vars(sharedVars(resolved)),
    vars(modeVars(resolved, "light")),
    vars(modeVars(resolved, "dark"), "-dark"),
    scaleMap("brand", scales.brand),
    scaleMap("neutral", scales.neutral),
    ...(scales.secondary ? [scaleMap("secondary", scales.secondary)] : []),
  ].join("\n\n");
}
