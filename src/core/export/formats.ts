// Every export Thevio offers, in the order the export dialog lists them.
// The dialog and the ZIP read this list; nothing else needs to know a
// format exists. Each format is pure: ResolvedTheme → files.

import type { ResolvedTheme } from "../theme/resolve";
import { toCss } from "./css";
import { toDesignMdFiles } from "./design-md";
import { toDtcg } from "./dtcg";
import { toFigma } from "./figma";
import type { ExportFile } from "./format";
import { toScss } from "./scss";
import { REGISTRY_NOTE, toShadcnRegistry } from "./shadcn-registry";
import { toTailwind } from "./tailwind";
import { toTokensStudio } from "./tokens-studio";

export type ExportFormat = {
  readonly id: string;
  readonly label: string;
  /** One line for the dialog. */
  readonly description: string;
  readonly files: (resolved: ResolvedTheme) => ExportFile[];
};

const single =
  (path: string, type: string, render: (resolved: ResolvedTheme) => string) =>
  (resolved: ResolvedTheme): ExportFile[] => [
    { path, contents: `${render(resolved)}\n`, type },
  ];

export const EXPORT_FORMATS: readonly ExportFormat[] = [
  {
    id: "css",
    label: "CSS (shadcn)",
    description:
      "globals.css for shadcn/ui on Tailwind v4: :root, .dark and @theme inline.",
    files: single("globals.css", "text/css", toCss),
  },
  {
    id: "tailwind",
    label: "Tailwind scales",
    description: "A @theme block with the 50–950 brand and neutral scales.",
    files: single("tailwind-scales.css", "text/css", toTailwind),
  },
  {
    id: "scss",
    label: "SCSS",
    description: "Variables for both modes, plus the scales as maps.",
    files: single("_theme.scss", "text/x-scss", toScss),
  },
  {
    id: "shadcn-registry",
    label: "shadcn registry",
    description: REGISTRY_NOTE,
    files: toShadcnRegistry,
  },
  {
    id: "design-md",
    label: "DESIGN.md (AI)",
    description:
      "The theme as instructions for Claude Code, Cursor, Copilot and Stitch.",
    files: toDesignMdFiles,
  },
  {
    id: "dtcg",
    label: "Design Tokens (DTCG)",
    description:
      "W3C DTCG 2025.10 files with a resolver, for Style Dictionary and Terrazzo.",
    files: toDtcg,
  },
  {
    id: "figma",
    label: "Figma Variables",
    description:
      "Light and Dark mode files for Figma's native variable import.",
    files: toFigma,
  },
  {
    id: "tokens-studio",
    label: "Tokens Studio",
    description: "One file with global, light and dark sets, shadows included.",
    files: toTokensStudio,
  },
];

/** Every file of every format: what the "Download all" ZIP holds. */
export function allExportFiles(resolved: ResolvedTheme): ExportFile[] {
  return EXPORT_FORMATS.flatMap((format) => format.files(resolved));
}
