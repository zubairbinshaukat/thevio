// /llms.txt (llmstxt.org): how an AI agent uses Thevio, in one page.

import { EXPORT_FORMATS } from "../export/formats";
import { MAX_BODY_BYTES } from "./theme";

export function llmsTxt(origin: string, themeNames: readonly string[]): string {
  const formats = EXPORT_FORMATS.map(
    (format) => `  - \`${format.id}\`: ${format.description}`,
  ).join("\n");
  return `# Thevio

> A visual theme builder for shadcn/ui and Tailwind CSS v4: build one theme, preview it everywhere, share it by URL, export it anywhere. Every theme is checked against WCAG 2 contrast in light and dark mode.

A theme lives entirely in its URL: \`${origin}/studio?t=<code>\`. The code is the whole theme (compressed), so there is no account and no database. The API below needs no key.

## Make a theme

- \`POST ${origin}/api/theme\` with any of these as the body (≤ ${MAX_BODY_BYTES / 1024} KB):
  - a partial Thevio theme: \`{"colors":{"brand":"#0f9d74"},"radius":0.75,"fonts":{"sans":"Manrope"}}\` (colours can be any CSS colour);
  - a pasted shadcn/tweakcn \`globals.css\` (Content-Type: text/css, or JSON \`{"css":"…"}\`);
  - tweakcn theme JSON or a shadcn registry item.
- The response has the fixed \`theme\`, its share code \`t\`, the Studio \`url\`, a shadcn \`install\` command, a URL per export, and \`fixes\`: every change made (clamped values, contrast fixes with before/after ratios).
- Add \`?fix=false\` to skip contrast fixing.

## Read, fix or export a shared theme

- \`GET ${origin}/api/theme?t=<code>\`: the same response for an existing link.
- \`GET ${origin}/api/theme?t=<code>&format=<id>\`: the export itself. Formats:
${formats}

## Install into a shadcn/ui project

- \`npx shadcn@latest add ${origin}/r/t/<code>.json\`: installs colours (light and dark), radius, fonts and shadows into globals.css. Component styles are not included; export \`design-md\` for those.
- Sample themes: ${themeNames.map((name) => `\`${origin}/r/${name}.json\``).join(", ")}.

## Give an AI tool the design

- \`GET ${origin}/api/theme?t=<code>&format=design-md\` returns DESIGN.md (Google's DESIGN.md format): tokens in front matter, then colours with measured contrast, typography, layout, shapes, the exact Tailwind classes for each component style, and do's and don'ts. Save it as \`DESIGN.md\` and reference it from CLAUDE.md, AGENTS.md or a Cursor rule.

## Reference

- [OpenAPI 3.1 description](${origin}/openapi.json): every endpoint, parameter and response schema.
- [Studio](${origin}/studio): the visual editor.
- Errors are RFC 9457 \`application/problem+json\` with a \`detail\` saying what to change.
`;
}
