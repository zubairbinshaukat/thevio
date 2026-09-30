# Thevio design direction

Research done 2026-09-30. It covers the landing page, the preloader and the page reveal, and it sets the visual language every later screen reuses. The decisions are in [§3](#3-direction), and the numbers are the tokens in `src/app/globals.css`.

---

## 1. Research findings

### Realtime Colors (primary competitor)

- **What it gets right:** the landing page *is* the editor. A bottom toolbar recolours the page you are reading. It is keyboard-first (Space randomises, Alt+T toggles mode, Ctrl+S shares) and exports to many formats.
- **Where Thevio beats it:**
  - **Tokens:** it has only 5 (`text`, `background`, `primary`, `secondary`, `accent`), with no muted, border, ring, radius, shadow or spacing.
  - **Scales:** its "scales" are alpha steps (`--text5`…`--text70`), not perceptual OKLCH ramps.
  - **Contrast:** a traffic light per colour, with no pair matrix.
  - **Demo copy:** placeholder jokes ("What (imaginary) people are saying", "Enterprise $0.00/month").
  - **Surfaces:** flat, with 3–10px radii and one grey centred shadow (`0 0 20px 1px #0000001a`).
- **Source:** realtimecolors.com, realtimecolors.com/docs/how-it-works

### Linear · Vercel · Raycast (live CSS, pulled 2026-09-30)

| | Linear | Vercel | Raycast |
|---|---|---|---|
| Type | Inter Variable 510/590/680. −0.012em ≤ 24px, −0.022em ≥ 32px, line-height 1.0–1.1 on display | Geist. Tracking tightens with size: −0.02em at 16–20px, −0.04em at 24–32px, −0.06em at 40–72px. Hero h1 set at **weight 400** with `text-wrap: balance` | Body 14px/1.6 at weight 500, **+0.2px** tracking. Headings 56–72px at 600–700 |
| Width | 1024px page, 24px inline padding, 64px block padding | 1200px page | Sections 120–158px tall |
| Radii | 4 · 6 · 8 · 12 · 16 · 24 · 32 · pill | Mostly 6 and 12, 24 for the largest | 4 · 6 · 8 · 12 · 16 · 20 · 24 |
| Depth (light) | 4–5 layer stack with a bottom inset edge | Borders drawn as `0 0 0 1px #00000014`. Elevation alphas **≤ 0.06** with negative spread | n/a (dark only) |
| Depth (dark) | Shadows set to **`none`**. Depth comes from surface steps (#08090a → #191a1b) and white-alpha borders | Same tokens redefined | `inset 0 1px #ffffff1a` top highlight (its most-used shadow). Tinted periwinkle glow at 5% alpha |
| Product shots | Real screens with realistic data, full column width | Real UI | Real UI |
| Easing | | | `cubic-bezier(.32,.72,0,1)`, 0.5–0.7s |

### Soft, shadow-rich UI (Dribbble, Awwwards, Godly, 2025–26)

- **One light source:**
  - Shadows fall straight down (y-offset only).
  - Larger elevations get more offset, more blur and *lower* opacity.
  - Negative spread keeps big layers tucked under the card.
  - Sources: Josh Comeau, *Designing beautiful shadows*; Tobias Ahlin, *Smoother & sharper shadows with layered box-shadows*.
- **Tint, never grey:**
  - A shadow is the background hue at lower lightness and low chroma.
  - Pure black shadows look muddy on anything tinted.
- **What reads as premium:**
  - A hairline ring and a 1px inset top highlight do more than any blur.
  - Grain is optional, and only at 0.2–0.3 opacity.
- **What reads as cheap:**
  - A single big grey centred blur.
  - Neumorphic paired shadows, which fail contrast and make controls look disabled.
  - Glow + gradient text + glass + grain stacked on one element.
- **Nested radii:** inner radius = outer radius − padding.
- **Godly:** favours restraint (grid discipline, a deliberate type scale, whitespace over motion gimmicks).

### How colour tools present real data

- **Tailwind:** an 11-column 50–950 grid. Swatches get a `-1px` inset outline at black/10 (white/10 in dark). Hovering shows the exact `oklch()` value in a mono tooltip.
- **Radix Colors:** labels each step by its job (background, interactive, border, solid, text).
- **uicolors.app / Coolors:** the in-context preview *is* the product; Coolors sells its visualizer on its own.

### Preloaders and reveals in Next.js (App Router, React 19)

- **Inline script:** a plain `<script dangerouslySetInnerHTML>` in the root layout's `<head>` runs during parsing, before first paint. `next/script beforeInteractive` doesn't guarantee that. (Local guide: `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.)
- **Dev caveat:** Strict Mode's dev remount resets `<html>`/`<body>` attributes. Keep preloader state on the overlay element and on `window`, not on `<html>`.
- **Don't hide SSR content with Motion's `initial`:**
  - It writes `opacity:0` into the server HTML, which breaks no-JS visitors and crawlers.
  - It also drops the element from LCP; Chromium ignores `opacity:0`.
- **LCP ignores occlusion:** opaque hero text under an opaque overlay is still recorded at first paint, so hide *nothing* in CSS.
- **Animate `transform` for the curtain:** it runs on the compositor and stays smooth while hydration keeps the main thread busy.
  - Animated `mask-image` gradients and `@property` radii repaint on the main thread every frame.
  - `clip-path: inset(… 100% … round r)` has a Chrome bug where the animation sticks, then jumps.
- **Motion bundle (gzip):**
  - `motion` component: 34 KB.
  - `LazyMotion` + `domAnimation`: ~20 KB.
  - `useAnimate` from `motion/react-mini`: ~2.3 KB. It uses WAAPI and commits final styles on finish.
- **Waiting for window `load`:** it also waits for Next's async chunks, so on slow networks the 3s cap is what ends the preloader. We keep `load` because the preloader's job is to hide a half-loaded page, and the cap bounds the cost.

---

## 2. What we take, and what we avoid

**Take**
1. The page shows **real engine output** everywhere a number or colour appears: `resolveTheme`, `checkPairs`, `validateAndFix`, `encodeTheme`, `toCss`/`toTailwind`/`toScss`. Nothing is typed in by hand.
2. Sample themes are recoloured live, like Realtime Colors, but the chrome stays neutral (decisions §9): only the preview surfaces, the glow and the shadow tint follow the theme.
3. Show every scale step with its OKLCH lightness, and mark the step the brand sits on ("your colour, untouched").
4. Show contrast in context: each pair is drawn in its own colours, with its ratio and an AA/AAA/UI badge.

**Avoid**
1. Grey or black shadows; neumorphism; more than one glow per viewport.
2. Radii that don't nest.
3. Fake product data or placeholder copy.
4. Content hidden in the server HTML (`opacity:0` from SSR).
5. Any animation that can trap the user: every wait has a cap, and JS failure still reveals the page.

---

## 3. Direction

**Soft and quiet.**
- Warm-white surfaces float on a barely tinted page.
- Diffused shadows carry the theme's hue.
- Corners are generous and the spacing is airy.
- One accent glow sits behind the product shot.
- Type is Geist, tight at display sizes and relaxed in body copy.

### 3.1 Colour

- **Hue:** `--hue` drives every tint.
  - It defaults to the default brand's hue (262.88, `#2563eb`).
  - The theme picker writes the active sample's brand hue onto `<html>`, so every shadow, the glow and the page tint follow it.
- **Light:**

  | Token | Value |
  |---|---|
  | page | `oklch(0.985 0.004 hue)` |
  | surface | `oklch(1 0 0)` |
  | sunken | `oklch(0.97 0.006 hue)` |
  | text | neutral 950 |
  | muted text | `oklch(0.5 0.016 hue)` (≥ 4.5:1 on page) |

- **Dark:**

  | Token | Value |
  |---|---|
  | page | `oklch(0.15 0.008 hue)` |
  | surface | `oklch(0.195 0.01 hue)` |
  | raised | `oklch(0.235 0.012 hue)` |
  | border | white at 8% |

- **Chrome accent:** neutral ink (a black button on light, white on dark), as Vercel and Linear do. Colour belongs to the theme being previewed.

### 3.2 Shadow scale (tokens `--shadow-xs` … `--shadow-2xl`)

- **Layers:** 2–3 per step, all straight down, low opacity.
- **Tint:** `oklch(var(--shadow-l) var(--shadow-c) var(--hue) / α)`, never black.
- **Declared `@theme inline`:** utilities inline the value, so `var(--hue)` resolves on each element and a subtree can re-tint its own shadows.
- **Dark mode:**
  - Tint lightness drops to 0.08 and alphas are multiplied by `--shadow-k: 3`.
  - Surfaces carry depth through lightness steps and a white 8% ring.

| Token | Layers (y blur spread · alpha) | Use |
|---|---|---|
| `xs` | 0 1 2 0 · .06 · 0 1 1 0 · .04 | chips, swatches |
| `sm` | 0 1 2 0 · .05 · 0 2 6 −1 · .06 | buttons, inputs, small cards |
| `md` | 0 2 4 −1 · .05 · 0 8 16 −4 · .07 | cards |
| `lg` | 0 2 4 −1 · .04 · 0 12 24 −6 · .07 · 0 24 40 −12 · .06 | floating panels, dock |
| `xl` | 0 4 8 −2 · .04 · 0 20 40 −10 · .08 · 0 40 72 −20 · .08 | feature cards on hover |
| `2xl` | 0 6 12 −4 · .05 · 0 32 64 −16 · .10 · 0 64 120 −32 · .10 | the hero product shot |

Every raised surface also gets `--edge`: a 1px ring (hue at 8% in light, white at 8% in dark) plus an inset top highlight (white at 70% in light, 6% in dark). It is applied through the `surface` utility, not added to the shadow scale.

### 3.3 Shape

- **Radii:** 8 (`sm`) · 12 (`md`) · 16 (`lg`) · 24 (`xl`) · 32 (`2xl`) · pill.
- **Nesting:** always nest. A 32px shell with 8px padding holds 24px cards; a 24px card with 12px padding holds 12px controls.

### 3.4 Type (Geist Sans; Geist Mono for values)

| Role | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display (h1) | `clamp(2.75rem, 1.6rem + 4.6vw, 4.75rem)` | 600 | −0.045em | 1.02, `text-wrap: balance` |
| Section title (h2) | `clamp(2rem, 1.4rem + 2.4vw, 3.25rem)` | 600 | −0.035em | 1.08 |
| Card title (h3) | 1.125–1.25rem | 600 | −0.02em | 1.3 |
| Lead | 1.0625–1.25rem | 400 | −0.005em | 1.6, muted |
| Body / UI | 0.875–1rem | 400–500 | 0 | 1.6 |
| Eyebrow / values | 0.75–0.8125rem Mono | 500 | +0.02em | uppercase only for eyebrows |

### 3.5 Space and layout

- **Page:** max width 1200px, gutters 16 / 24 / 32px (mobile / tablet / desktop).
- **Sections:** 72px padding on mobile, 112px on tablet, 144px on desktop. Space separates sections, not rules.
- **Grid:** 12 columns on desktop; a single column below 768px.
- **Floating dock:** it sits 16px from the bottom, so the footer reserves 96px.

### 3.6 Motion

| What | Easing | Duration |
|---|---|---|
| Content in (Motion `useAnimate`) | `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) | 0.7s, 14px rise |
| Curtain (CSS) | `cubic-bezier(0.76, 0, 0.24, 1)` | 0.9s |
| Hover / press | `cubic-bezier(0.32, 0.72, 0, 1)` | 200–300ms, transform and shadow only |

- **Stagger:** 60ms.
- **Reduced motion:**
  - The preloader mark doesn't animate.
  - The exit is a 250ms fade.
  - Content fades without the rise.

---

## 4. Preloader and reveal

**Where:** inline in the root layout (`src/features/preloader/`), so it covers every hard load.

1. **`<head>` script (blocking, ~1.4 KB).** It runs before first paint:
   - Applies the saved or system colour mode (`.dark`).
   - Reads `?t=`: codec prefix `1`, lz-string decode (inlined, tested against `lz-string`), then the light `primary` override or the `brand` tuple, validated as 3–4 finite numbers.
   - Sets `--tv-pre`. With no `t`, the CSS default is the default brand `oklch(0.5461 0.2152 262.88)`, so the no-param page is never colourless.
2. **Overlay `#tv-pre` (inline CSS + SVG).**
   - Two stacked panels (page colour on top, a brand-tinted panel beneath) and the Thevio mark in the primary colour.
   - The mark assembles: the T bar unfolds from the centre, then the V legs rise. A soft primary glow breathes behind it, and a slim indeterminate bar runs below.
   - In dark mode the colour is lifted with relative colour syntax (`oklch(from … max(l, .62) c h)`) so a dark brand stays visible. In light mode it is capped at L 0.7 for pale brands.
3. **Wait:**
   - It waits for `document.fonts.ready`, every `img[data-critical]` to `decode()`, and window `load`.
   - **Minimum 600ms** (no flash), **maximum 2.8s** from navigation start (never trap).
4. **Reveal:**
   - The mark lifts and fades (250ms).
   - The top panel slides up (`translateY(-100%)`, 0.9s) and the tinted panel follows 110ms later. Both have a soft curved leading edge.
   - Content starts rising 180ms after the curtain starts, driven by `window.__tv.on()`.
5. **Safety:**
   - **CSS-only cap:** `#tv-pre` fades out on its own at 3.2s, so it never traps the user, even if the script fails.
   - **No JS:** `<noscript>` hides the overlay.
   - **After the reveal:** `pointer-events: none` once the reveal starts, and the overlay is set `hidden` when it ends.
   - **Semantics:** the overlay is `aria-hidden`, and it never traps focus.
6. **Content reveal (Motion mini):**
   - The server HTML is always fully visible.
   - After hydration, if the overlay still covers the page, each `Reveal` group sets its items to the start pose under the cover. It animates them in on the reveal signal, or later when it scrolls into view.
   - If hydration lands after the reveal, anything already on screen is left alone.

---

## 5. Landing page map (all data from `src/core`)

| # | Section | Real data shown |
|---|---|---|
| 0 | Nav | colour-mode toggle |
| 1 | Hero + product shot | active theme: brand oklch/hex, radius, style preset, 50–950 strip, live preview components in the theme's tokens, contrast summary (`checkPairs`), share-link length |
| 2 | Build: scales | brand / neutral (/ secondary) scales from `resolveTheme().scales`, L value per step, base step marked; semantic tokens |
| 3 | Validate: contrast | light and dark panels drawn in their own tokens, key pairs with ratio and badge, totals over all `PAIRS`, fixes made by `validateAndFix` |
| 4 | Share | the real `encodeTheme` link, its length, and the decoded diff payload |
| 5 | Export | `toCss` / `toTailwind` / `toScss` output with a copy button |
| 6 | CTA + footer | credits (decisions §7) |

**Sample themes:**
- **Default:** exactly `DEFAULT_THEME`.
- **Grove, Ember, Iris:** inputs run through `validateAndFix` (so they pass WCAG 2 in both modes).
- **The picker:** a floating dock, like Realtime Colors' toolbar, recolours everything.

---

## 6. Staying inside the budget

The landing page carries real data and still fits the `marketing` budget (JS 145 KB, HTML 30 KB gzip). How:

- **Client islands use `cx` (`src/lib/cx.ts`), not `cn`.** `cn` merges Tailwind classes but ships a ~57 KB (raw) config.
- **Client icons come from `src/components/icons.tsx`.** These are Lucide paths as plain SVG, so no lucide-react runtime ships. Server code can still use lucide-react.
- **Landing links are plain `<a>`.** `next/link`'s runtime isn't needed, and a full load into `/studio?t=` is what lets the preloader take the theme's colour.
- **The big islands opt out of the React Compiler (`"use no memo"`).** They re-render only when the sample changes.
- **Export snippets load on demand** from the static `/showcase.json` when the Export section nears the viewport. Only the default CSS is in the page.
- **Preview scopes carry only the tokens they paint** (19 colours + 3 status colours + 5 component vars), not all 38 per mode.
- **The root `not-found` stays tiny and server-only.** Its tree ships inside every page's RSC payload.

Headroom is small: the next landing feature should move more into lazy JSON or server markup.

## 8. Preview style layer (M3)

Research (2026-09-30):
- **Radix Themes is the closest model.** One root carries CSS variables and `data-*` attributes; variants are zero-specificity `:where()` selectors, and overlays are re-themed through a portal container.
- **shadcn "create" styles (Maia, Lyra, Vega) show what a style changes:** radius, fill vs line, density and focus treatment.
- **tweakcn and Realtime Colors don't scope at all.**

What Thevio does:
- **One root, `ThemeScope`** (`src/features/preview/theme-scope.tsx`).
  - It carries `toScope(resolved, mode)`: every theme variable, the `--tv-*` component variables, and `data-surface`, `data-density`, `data-button`, `data-button-style`, `data-input`, `data-focus`, `data-tabs` and `data-mode`.
  - Overlays portal into a node inside the root, so dialogs, menus, selects and tooltips keep the theme. `contain: layout` makes a dialog cover only its preview.
  - Scopes can't nest, because token selectors match any ancestor.
- **`data-mode`, not `.dark`** (amends plan §D.2). The chrome's `.dark` would pull the site's own variables into the preview. Preview components never use `dark:`; every mode difference is a variable.
- **Its own stylesheet** (`preview.css`): a second Tailwind build that scans only `src/features/preview/`, imported by `ThemeScope`. It loads only where previews render, so it never grows the site's global CSS; `globals.css` excludes that folder. Its utilities are scoped to `.tv-preview` at build time (see §10).
  - Theme radius and shadow utilities are removed from that build, so preview code can't collide with the chrome's `rounded-lg`/`shadow-md`. Use `rounded-(--radius)` and the like instead.
  - Each style is one `@utility` with `:where([data-…] *)` branches: `tv-surface`, `tv-overlay`, `tv-focus`, `tv-btn-primary`, `tv-field`, `tv-tabs`, `tv-tab`.
- **Contrast is guaranteed, not hoped for.** Colours a style derives are computed in core (`resolve.ts`, using `mixOklch`, which matches CSS `color-mix(in oklch)`) and solved to their WCAG 2 targets:

  | Colour | Target |
  |---|---|
  | `--tv-soft-bg` | primary tinted 12% (light) / 20% (dark) into the page |
  | `--tv-soft-fg` | ≥ 4.5:1 on the soft fill |
  | `--tv-primary-text` | ≥ 4.5:1 on page and card |
  | `--tv-field` | the filled-input background |
  | `--tv-line` | ≥ 3:1 on page, card and field; the boundary of underline and filled inputs, checkboxes, radios and switch tracks |

  `checkComponentPairs` proves each one. The Studio page checks 168 pairs at build time and fails the build on any miss.

The three presets:

| | shadcn | Soft | Crisp |
|---|---|---|---|
| Surfaces | hairline border | floating shadow | flat tinted panel |
| Density | default | comfortable | compact |
| Buttons | rounded, solid | pill, soft tint | square, outline |
| Inputs | outlined | filled, bottom line | underline only |
| Focus | ring + halo | glow | offset outline |
| Tabs | segmented | pill | underline |

**Where to see it:** the `/studio` editor. The M3 side-by-side check (four sample themes × three presets × both modes) now runs as a test (`features/studio/contrast.test.ts`).

## 10. Studio editor (first slice, 2026-09-30)

`/studio` is the editor: controls on the left, a live preview on the right (stacked, preview first, below `lg`).

- **Scope of this slice:** brand colour (OKLCH picker), neutral tint, fonts (body, headings, code), radius, style preset + the seven tokens, contrast summary with "Fix all", undo/redo, share link. Preview pages: landing, dashboard, sign-in, settings, at desktop, 768px or 390px, light or dark.
- **State:** an in-memory history (`history.ts`) is the source of truth; the URL mirrors it (`?t=` theme, `?p=` page, history `replace`, throttled to 300ms). The URL is read once, on load. A drag or a burst of typing on one control is one undo step.
- **Pins:** editing the brand or the neutrals drops the pinned colours derived from them, so an old contrast fix can't freeze the control.
- **Fonts:** Google Fonts CSS2 at runtime (`fonts.ts`), from a curated list in `config/fonts.ts`; any other family can be typed. The picker draws each option in its own face from `text=` subsets, renamed (`tvp …`) so a subset never shadows the real font.
- **Three Tailwind builds on one page.** `globals.css` (every page), `features/studio/studio.css` (the editor's controls) and `preview.css` all emit classes like `.hidden`. `scripts/postcss-scope-utilities.mjs` scopes the two route-level builds to their region (`.tv-preview …`, and the `.tv-studio` root minus the preview), so no build's `hidden` can beat another's `md:block`, whatever the load order. The Studio's popovers portal into its root for this. The shared chrome tokens live in `app/chrome-theme.css`.
- **Budget:** `/studio` ships 263 KB of its 300 KB JS and 19.4 KB of its 20 KB CSS. zod is imported as a namespace (`import * as z`) so Turbopack can tree-shake it (that alone saved 58 KB).

## 9. Verification checklist

- [x] Screenshots at 375 / 768 / 1440, light and dark, plus the preloader mid-animation and with `?t=` (Ember link, light and dark), the curtain mid-flight, and reduced motion.
- [x] No horizontal scroll at 375, 768 or 1440.
- [x] Every number on the page traces to a core function (`data.ts` computes all of them at build time, and `data.test.ts` checks them).
- [x] Shadows are tinted and never black; radii nest; there is one glow per viewport.
- [x] Reduced motion: no transforms; the overlay fades (reveal ~860ms, no curtain).
- [x] With JS disabled, `<noscript>` hides the overlay. With the script broken, the CSS-only cap fades it at 3.2s.
- [x] No console errors or hydration warnings in production. (Locally, `/_vercel/insights/script.js` 404s; it exists only on Vercel.)
- [x] `pnpm check` and `pnpm perf:budget` pass.
