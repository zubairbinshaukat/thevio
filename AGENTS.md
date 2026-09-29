<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

Thevio is a visual theme builder: build one theme, preview it everywhere, share it by URL, export it anywhere.

- **Scope rule:** every feature must serve *build, preview, validate, share, or export*. If it doesn't, it's out.
- **Local notes** (decisions, plans, research) live in `.zubair/`. It is gitignored: never commit, move, or delete it.

## Stack

Next.js 16 (App Router, Turbopack, React Compiler, typed routes) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Radix base) · Biome · Vitest + Testing Library · lefthook · pnpm 12 · Node 24.

Runtime libs for later phases: zod, nuqs, lz-string, culori, apca-w3, recharts, motion, jszip, html-to-image, @vercel/analytics.

## Folder rules

```
src/
  app/          # routes only; keep them thin
  core/         # PURE TypeScript: no React, no DOM. Shared by client + API.
                #   theme/ color/ contrast/ export/ codec/
  features/     # React feature slices: studio/ preview/ export/
  components/ui # shadcn-generated only (add via `pnpm dlx shadcn@latest add <name>`)
  config/       # site config
  lib/          # small shared helpers (cn)
  test/         # Vitest setup
```

- Create a folder only when it has a real file. No empty `index.ts` stubs.
- `core/` must never import from `react`, `next`, or the DOM. Exports are pure `theme -> string` functions.
- Tests sit next to the code: `*.test.ts` runs in node, `*.test.tsx` runs in jsdom.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `lint:fix` | `biome check` (with `--write`) |
| `pnpm format` | `biome format --write` |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |
| `pnpm test` / `test:watch` | Vitest |
| `pnpm check` | lint + typecheck + test |

Git hooks (lefthook): pre-commit runs Biome on staged files; pre-push runs typecheck + test.
