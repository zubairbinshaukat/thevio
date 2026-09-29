// ResolvedTheme → what a live preview root needs: every custom property for
// one mode, and the component-token data attributes. The same variable set
// the CSS export writes, so a preview and an exported theme can't disagree.

import type { Mode, ResolvedTheme } from "../theme/resolve";
import { modeVars, sharedVars } from "./format";

export type ScopeStyle = {
  /** `--name` → value, ready for a `style` prop. */
  readonly vars: Readonly<Record<`--${string}`, string>>;
  readonly attributes: Readonly<Record<string, string>>;
};

export function toScope(resolved: ResolvedTheme, mode: Mode): ScopeStyle {
  const entries = [...sharedVars(resolved), ...modeVars(resolved, mode)];
  return {
    vars: Object.fromEntries(
      entries.map(([name, value]) => [`--${name}`, value]),
    ),
    attributes: { ...resolved.components.attributes, "data-mode": mode },
  };
}
