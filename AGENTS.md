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

Runtime libs for later phases: zod, nuqs, lz-string, culori, recharts, motion, fflate (ZIP), @zumer/snapdom (PNG), @vercel/analytics. Contrast is WCAG 2 only (culori `wcagContrast`); there is no APCA.

- **Marketing client code** uses `cx` (`src/lib/cx.ts`) instead of `cn`, and `src/components/icons.tsx` instead of lucide-react: both keep `/` inside its JS budget (see DESIGN.md §6). The preloader lives in `src/features/preloader/`; its scripts are inlined with `.toString()`, so they must stay self-contained.
- **fflate and SnapDOM load only on Export click** (`import()` inside the handler, prefetched on hover). Never import them statically: `perf:budget` fails if their code reaches any route's initial JS.

## Folder rules

```
src/
  app/          # routes only; keep them thin
  core/         # PURE TypeScript: no React, no DOM. Shared by client + API.
                #   theme/ color/ contrast/ export/ codec/
  features/     # React feature slices: studio/ preview/ export/
  components/   # app-wide client bits (e.g. analytics wrapper)
  components/ui # shadcn-generated only (add via `pnpm dlx shadcn@latest add <name>`)
  config/       # site config
  lib/          # small shared helpers (cn)
  test/         # Vitest setup
scripts/        # build-time Node scripts (.mts, run with plain `node`)
```

- Create a folder only when it has a real file. No empty `index.ts` stubs.
- `core/` must never import from `react`, `next`, or the DOM. Exports are pure `theme -> string` functions.
- Tests sit next to the code: `*.test.ts` runs in node, `*.test.tsx` runs in jsdom.

## Performance rules

- **Cache Components + Partial Prefetching are on.** No `dynamic`, `revalidate`, `fetchCache` or `dynamicParams` segment exports; use `use cache` / `<Suspense>` instead. Dynamic routes must return at least one param from `generateStaticParams`. Never set `runtime = "edge"`.
- The `default` cache profile is redefined in `next.config.ts` (30-day revalidate), so a bare `use cache` means that.
- Keep the root layout free of client providers. `NuqsAdapter` lives in `app/studio/layout.tsx` only.
- Only Geist Sans is preloaded. Don't preload a font the first paint doesn't use.
- Budgets live in `perf-budgets.json` and are enforced by `pnpm perf:budget` (also in CI). Add every new route type there.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `lint:fix` | `biome check` (with `--write`) |
| `pnpm format` | `biome format --write` |
| `pnpm typecheck` | `next typegen && tsc --noEmit` |
| `pnpm test` / `test:watch` | Vitest |
| `pnpm check` | lint + typecheck + test |
| `pnpm perf:budget` | build, then fail if any route exceeds `perf-budgets.json` |
| `pnpm icons` | regenerate every icon from the mark in `src/config/brand.ts` |

**Brand:** the mark lives once, as paths, in `src/config/brand.ts`. Use `<Logo />` (`src/components/logo.tsx`) in UI; it takes `currentColor`, so it's black on light and white on dark. Never copy the paths elsewhere; after changing them run `pnpm icons` and commit the outputs.

Git hooks (lefthook): pre-commit runs Biome on staged files; pre-push runs typecheck + test. CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and `perf:budget`.
