"use client";
// These islands only re-render when the sample changes; the compiler's
// memo slots would cost more bytes than they save renders.
"use no memo";

import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { CheckIcon } from "@/components/icons";
import { cx } from "@/lib/cx";
import type { StageTheme, ThemeId } from "./data";
import { studioPath, useShowcase } from "./showcase";

const PRESET_NAMES = {
  shadcn: "shadcn",
  soft: "Soft",
  crisp: "Crisp",
} as const;

/** The hero's product shot: the Studio frame, previewing the active sample. */
export function HeroStage({
  themes,
  logo,
}: {
  themes: Record<ThemeId, StageTheme>;
  /** Rendered on the server, so the mark's paths stay out of this bundle. */
  logo: ReactNode;
}) {
  const id = useShowcase();
  const theme = themes[id];
  const { components: c } = theme;

  return (
    <div className="relative">
      {/* The page's one glow, in the active brand colour. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-20 bottom-1/3 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--brand)_34%,transparent),transparent)] opacity-75 blur-2xl transition-[background] duration-700 dark:opacity-60"
      />
      <div className="surface rounded-2xl p-1.5 shadow-2xl md:p-2">
        <div className="overflow-hidden rounded-[1.375rem] bg-sunken ring-1 ring-edge md:rounded-xl">
          <TopBar theme={theme} logo={logo} />
          <div className="grid grid-cols-1 lg:grid-cols-[17rem_1fr]">
            <TokenList theme={theme} />
            <div className="p-3 md:p-5">
              <div
                className="tv-scope rounded-[calc(var(--radius)*1.6)] bg-background p-4 text-foreground shadow-sm ring-1 ring-edge transition-colors duration-500 md:p-6"
                data-theme={id}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <ScaleCard theme={theme} className="md:col-span-5" />
                  <ShareCard theme={theme} className="md:col-span-3" />
                  <ChartCard theme={theme} className="md:col-span-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only">
        Preview of the {theme.label} theme: brand {theme.brand.hex}, radius{" "}
        {theme.radius}rem, {c.buttonShape} buttons.
      </p>
    </div>
  );
}

function TopBar({ theme, logo }: { theme: StageTheme; logo: ReactNode }) {
  return (
    <div className="flex h-12 items-center gap-3 border-edge border-b bg-card/70 px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2 font-medium text-sm">
        {logo}
        <span>Studio</span>
        <span className="text-muted-foreground/60">/</span>
        <span className="truncate text-muted-foreground">{theme.label}</span>
      </div>
      <div className="ml-auto flex min-w-0 items-center gap-1 rounded-full bg-sunken py-1 pr-1 pl-3 ring-1 ring-edge">
        <span className="max-w-36 truncate font-mono text-[0.6875rem] text-muted-foreground sm:max-w-64 md:max-w-88">
          thevio.zubyr.dev{studioPath(theme.share.t)}
        </span>
        <CopyButton
          text={studioPath(theme.share.t)}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
        />
      </div>
    </div>
  );
}

function TokenRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[0.8125rem]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-2 text-right font-mono text-[0.75rem]">
        {children}
      </dd>
    </div>
  );
}

function TokenList({ theme }: { theme: StageTheme }) {
  const allPass =
    theme.passing.light === theme.checked &&
    theme.passing.dark === theme.checked;
  return (
    <dl className="grid grid-cols-1 divide-y divide-edge border-edge bg-card/50 px-4 py-2 max-lg:border-b sm:grid-cols-2 sm:gap-x-6 sm:divide-y-0 lg:block lg:divide-y lg:border-r lg:px-5 lg:py-3">
      <TokenRow label="Brand">
        <span
          className="size-3.5 shrink-0 rounded-[4px] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.1)]"
          style={{ background: theme.brand.css }}
        />
        <span className="truncate">{theme.brand.hex}</span>
      </TokenRow>
      <TokenRow label="Neutral tint">
        <span className="truncate">
          {theme.neutral.chroma === 0
            ? "pure grey"
            : `h${Math.round(theme.neutral.hue)} · c${theme.neutral.chroma}`}
        </span>
      </TokenRow>
      <TokenRow label="Radius">{theme.radius}rem</TokenRow>
      <TokenRow label="Style">
        {theme.preset ? PRESET_NAMES[theme.preset] : "custom"}
      </TokenRow>
      <TokenRow label="WCAG 2 pairs">
        <span
          className={cx(
            "inline-flex items-center gap-1",
            allPass && "text-foreground",
          )}
        >
          {allPass && <CheckIcon className="size-3.5" strokeWidth={2.5} />}
          {theme.passing.light + theme.passing.dark}/{theme.checked * 2}
        </span>
      </TokenRow>
      <TokenRow label="Auto-fixes">{theme.fixes}</TokenRow>
    </dl>
  );
}

// --- Preview components: styled only by the scope's theme variables. -----

const card =
  "rounded-[calc(var(--radius)*1.4)] border-border border-(length:--tv-surface-border) bg-card p-4 text-card-foreground shadow-(--tv-surface-shadow) md:p-5";

function CardTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3.5 flex items-baseline justify-between gap-3">
      <h3 className="shrink-0 font-semibold text-sm tracking-tight">{title}</h3>
      {note && (
        <span className="truncate font-mono text-[0.6875rem] text-muted-foreground">
          {note}
        </span>
      )}
    </div>
  );
}

function ScaleCard({
  theme,
  className,
}: {
  theme: StageTheme;
  className?: string;
}) {
  return (
    <div className={cx(card, className)}>
      <CardTitle
        title="Brand scale"
        note={`${theme.brand.css} → step ${theme.brand.step}`}
      />
      <div className="flex gap-1 sm:gap-1.5">
        {theme.brandScale.map((swatch) => (
          <div key={swatch.step} className="min-w-0 flex-1">
            <div
              className="relative h-9 rounded-[calc(var(--radius)*0.6)] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.06)] transition-colors duration-500 sm:h-11"
              style={{ background: swatch.css }}
              title={`${swatch.step} · ${swatch.css}`}
            >
              {swatch.base && (
                <span
                  className={cx(
                    "absolute inset-x-0 bottom-1.5 mx-auto size-1.5 rounded-full",
                    swatch.dark ? "bg-white" : "bg-black/70",
                  )}
                />
              )}
            </div>
            <div className="mt-1.5 text-center font-mono text-[0.5625rem] text-muted-foreground tabular-nums sm:text-[0.625rem]">
              {swatch.step}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ShareCard({
  theme,
  className,
}: {
  theme: StageTheme;
  className?: string;
}) {
  const { components: c } = theme;
  const primary = {
    solid: "bg-primary text-primary-foreground hover:opacity-90",
    soft: "bg-primary/12 text-primary hover:bg-primary/18",
    outline: "border border-primary text-primary hover:bg-primary/6",
  }[c.buttonStyle];
  const input = {
    outline: "rounded-[var(--radius)] border border-input bg-background px-3",
    filled: "rounded-[var(--radius)] bg-muted px-3",
    underline: "rounded-none border-input border-b bg-transparent px-0",
  }[c.inputStyle];
  const control =
    "inline-flex h-(--tv-control-h) items-center justify-center rounded-(--tv-btn-radius) px-(--tv-pad-x) font-medium text-sm transition-[opacity,background-color] duration-200";

  return (
    <div className={cx(card, className)}>
      <CardTitle
        title="Share this theme"
        note={`${theme.share.length} chars`}
      />
      <p className="mb-3 text-muted-foreground text-sm leading-relaxed">
        Only what differs from the defaults travels in the link.
      </p>
      <label className="block">
        <span className="sr-only">Share link</span>
        <input
          readOnly
          value={`thevio.zubyr.dev${studioPath(theme.share.t)}`}
          className={cx(
            "h-(--tv-control-h) w-full truncate font-mono text-foreground text-xs outline-none",
            input,
          )}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton
          text={studioPath(theme.share.t)}
          label="Copy link"
          className={cx(control, primary)}
        />
        <a
          href="#export"
          className={cx(
            control,
            "bg-secondary text-secondary-foreground hover:opacity-90",
          )}
        >
          Export
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge tone="success">
          {theme.passing.light}/{theme.checked} light
        </Badge>
        <Badge tone="success">
          {theme.passing.dark}/{theme.checked} dark
        </Badge>
        <Badge tone={theme.fixes ? "warning" : "info"}>
          {theme.fixes} auto-fixed
        </Badge>
        <Badge tone="info">OKLCH</Badge>
      </div>
    </div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    success: ["bg-success/14", "bg-success"],
    warning: ["bg-warning/20", "bg-warning"],
    info: ["bg-info/14", "bg-info"],
  } as const;
  const [fill, dot] = tones[tone];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-(--tv-btn-radius) px-2 font-medium text-[0.6875rem] text-foreground",
        fill,
      )}
    >
      <span aria-hidden className={cx("size-1.5 rounded-full", dot)} />
      {children}
    </span>
  );
}

function ChartCard({
  theme,
  className,
}: {
  theme: StageTheme;
  className?: string;
}) {
  const modes = ["light", "dark"] as const;
  const series = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
  return (
    <div className={cx(card, className)}>
      <CardTitle title="Chart series" note="vs page · min 3:1" />
      {modes.map((mode) => {
        const ratios = theme.chartRatios[mode];
        // Headroom above the tallest bar for its label.
        const top = Math.max(...ratios, 3) * 1.22;
        const at = (ratio: number) => `${(ratio / top) * 100}%`;
        return (
          <div
            key={mode}
            className={cx(
              "relative h-32 border-border border-b",
              mode === "light" ? "dark:hidden" : "hidden dark:block",
            )}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 border-muted-foreground/45 border-t border-dashed"
              style={{ bottom: at(3) }}
            />
            <div className="absolute inset-0 flex gap-2">
              {series.map((token, i) => {
                const ratio = ratios[i] ?? 0;
                return (
                  <div key={token} className="relative flex-1">
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-[calc(var(--radius)*0.6)] transition-[height,background-color] duration-700 ease-out-expo"
                      style={{
                        height: at(ratio),
                        background: `var(--${token})`,
                      }}
                    />
                    <span
                      className="absolute inset-x-0 mb-1 text-center font-mono text-[0.625rem] text-muted-foreground tabular-nums transition-[bottom] duration-700 ease-out-expo"
                      style={{ bottom: at(ratio) }}
                    >
                      {ratio.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="mt-2.5 text-muted-foreground text-xs">
        Contrast ratio of each series against the page.
      </p>
    </div>
  );
}
