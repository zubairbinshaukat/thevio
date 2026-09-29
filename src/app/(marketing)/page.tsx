import { ArrowRightIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DEFAULT_LINK_LENGTH,
  EXPORTS_URL,
  PAIR_COUNT,
  SHOWCASE,
  scopeStyles,
  slice,
  stageSlice,
  THEME_IDS,
  type ThemeId,
} from "@/features/landing/data";
import { HeroStage } from "@/features/landing/hero-stage";
import { Section } from "@/features/landing/section";
import {
  ContrastExplorer,
  ExportExplorer,
  ScaleExplorer,
  ShareExplorer,
} from "@/features/landing/sections";
import {
  type DockTheme,
  ShowcaseProvider,
  ThemeDock,
} from "@/features/landing/showcase";

const dock = Object.fromEntries(
  THEME_IDS.map((id): [ThemeId, DockTheme] => [
    id,
    {
      label: SHOWCASE[id].label,
      hue: SHOWCASE[id].hue,
      brand: SHOWCASE[id].brand.css,
      t: SHOWCASE[id].share.t,
    },
  ]),
) as Record<ThemeId, DockTheme>;

export default function HomePage() {
  return (
    <ShowcaseProvider themes={dock}>
      {/* Every sample's tokens, both modes, for the preview scopes. */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated from our own theme engine */}
      <style dangerouslySetInnerHTML={{ __html: scopeStyles() }} />
      <SiteHeader />
      <main className="flex-1">
        <section className="overflow-x-clip pt-12 pb-6 md:pt-18 lg:pt-16">
          <div className="page">
            <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <p
                data-rise
                className="surface inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-2.5 text-muted-foreground text-xs shadow-xs"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full bg-brand shadow-[0_0_0_3px_color-mix(in_oklch,var(--brand)_22%,transparent)] transition-colors duration-500"
                />
                Every value on this page comes from the engine
              </p>
              <h1 data-rise className="mt-6 text-display">
                Build one theme.
                <br /> Preview it everywhere.
              </h1>
              <p
                data-rise
                className="mt-6 max-w-xl text-lead text-muted-foreground"
              >
                Pick a brand colour. Thevio derives OKLCH scales, light and dark
                tokens and every contrast pair, fixes what fails WCAG 2, then
                hands you a link and the code.
              </p>
              <div
                data-rise
                className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
              >
                <a
                  href="/studio"
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-4.5 font-medium text-primary-foreground shadow-md transition-[opacity,scale] duration-200 ease-soft hover:opacity-92 active:scale-[0.97] max-sm:text-[0.9375rem] sm:px-5"
                >
                  Open the Studio
                  <ArrowRightIcon className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#build"
                  className="surface inline-flex h-11 items-center rounded-full px-4.5 font-medium shadow-xs transition-shadow duration-300 ease-soft hover:shadow-md max-sm:text-[0.9375rem] sm:px-5"
                >
                  See the engine
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.2} className="mx-auto mt-12 max-w-6xl md:mt-16">
              <HeroStage
                themes={stageSlice()}
                logo={<Logo decorative className="size-4 shrink-0" />}
              />
            </Reveal>
          </div>
        </section>

        <Section
          id="build"
          step="01"
          name="Build"
          title={
            <>
              One colour in.
              <br /> A whole system out.
            </>
          }
          lead="Your brand colour lands exactly on its nearest step, untouched. Every other step follows a lightness curve averaged from Tailwind v4, with chroma peaking at 600 and every value mapped into sRGB."
        >
          <ScaleExplorer
            scales={slice("scales")}
            semantic={slice("semantic")}
          />
        </Section>

        <Section
          id="validate"
          step="02"
          name="Validate"
          title="Contrast you never have to check."
          lead={`Every text, control, focus and chart pair is measured with WCAG 2, ${PAIR_COUNT} per mode. What fails is fixed by moving lightness only, so the hue you picked stays yours. Even stock shadcn neutral needs a few.`}
        >
          <ContrastExplorer
            contrast={slice("contrast")}
            fixes={slice("fixes")}
            passingBefore={slice("passingBefore")}
          />
        </Section>

        <Section
          id="share"
          step="03"
          name="Share"
          title="The whole theme fits in a link."
          lead="No account, no database. Only what differs from the defaults travels, compressed behind a version prefix, so a link made today still opens next year."
        >
          <ShareExplorer
            share={slice("share")}
            defaultLength={DEFAULT_LINK_LENGTH}
          />
        </Section>

        <Section
          id="export"
          step="04"
          name="Export"
          title="Paste it anywhere."
          lead="Plain functions turn the resolved theme into files: shadcn's globals.css for Tailwind v4, a Tailwind @theme with the full scales, and SCSS. What you see below is their actual output."
        >
          <ExportExplorer
            initialCss={SHOWCASE.default.exports.css}
            src={EXPORTS_URL}
          />
        </Section>

        <section className="pb-10 md:pb-16">
          <div className="page">
            <Reveal>
              <div className="surface relative overflow-hidden rounded-2xl px-6 py-14 text-center shadow-xl md:px-12 md:py-20">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,color-mix(in_oklch,var(--brand)_16%,transparent),transparent)] transition-[background] duration-700"
                />
                <div className="relative">
                  <h2 className="mx-auto max-w-xl text-title">
                    Start from your brand colour.
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-lead text-muted-foreground">
                    One theme, checked in both modes, ready to share and paste.
                  </p>
                  <a
                    href="/studio"
                    className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-md transition-[opacity,scale] duration-200 ease-soft hover:opacity-92 active:scale-[0.97]"
                  >
                    Open the Studio <ArrowRightIcon className="size-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ThemeDock themes={dock} />
    </ShowcaseProvider>
  );
}
