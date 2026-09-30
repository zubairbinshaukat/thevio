// What each token is for, in words. Token formats carry these as
// descriptions, so designers and AI tools see intent, not just values.
// Wording follows shadcn's theming docs (ui.shadcn.com/docs/theming).

import type { ColorToken } from "../theme/tokens";

export const COLOR_DESCRIPTIONS: Readonly<Record<ColorToken, string>> = {
  background: "Default app background.",
  foreground: "Default text on background.",
  card: "Elevated surfaces: cards, panels.",
  "card-foreground": "Text on cards.",
  popover: "Floating surfaces: popovers, menus, dialogs.",
  "popover-foreground": "Text on popovers.",
  primary: "High-emphasis actions and brand surfaces.",
  "primary-foreground": "Text and icons on primary.",
  secondary: "Lower-emphasis filled actions.",
  "secondary-foreground": "Text on secondary.",
  muted: "Subtle surfaces: tracks, skeletons, empty states.",
  "muted-foreground": "Lower-emphasis text: descriptions, placeholders.",
  accent: "Hover, focus and selected surfaces.",
  "accent-foreground": "Text on accent.",
  destructive: "Destructive actions and errors.",
  "destructive-foreground": "Text on destructive (tweakcn compatibility).",
  border: "Default borders and dividers.",
  input: "Form control borders.",
  ring: "Focus rings.",
  "chart-1": "Chart series 1.",
  "chart-2": "Chart series 2.",
  "chart-3": "Chart series 3.",
  "chart-4": "Chart series 4.",
  "chart-5": "Chart series 5.",
  sidebar: "Sidebar surface.",
  "sidebar-foreground": "Sidebar text.",
  "sidebar-primary": "Active items inside the sidebar.",
  "sidebar-primary-foreground": "Text on sidebar-primary.",
  "sidebar-accent": "Hovered and open items inside the sidebar.",
  "sidebar-accent-foreground": "Text on sidebar-accent.",
  "sidebar-border": "Sidebar dividers.",
  "sidebar-ring": "Focus rings inside the sidebar.",
};

export const SEMANTIC_DESCRIPTIONS: Readonly<Record<string, string>> = {
  success: "Success states and positive values.",
  "success-foreground": "Text on success.",
  warning: "Warnings.",
  "warning-foreground": "Text on warning.",
  info: "Informational states.",
  "info-foreground": "Text on info.",
};

/** Colours the component styles derive (`--tv-*`), by ComponentColors key. */
export const COMPONENT_COLOR_DESCRIPTIONS: Readonly<Record<string, string>> = {
  softBg: "Soft fill: soft buttons, pill tabs. Primary tinted into the page.",
  softFg: "Text on the soft fill (≥ 4.5:1).",
  primaryText: "Primary as text on the page and cards (≥ 4.5:1).",
  field: "Filled input background.",
  line: "Input boundary line (≥ 3:1 on page, card and field).",
};
