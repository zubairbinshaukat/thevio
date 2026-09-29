"use client";
// These islands only re-render when the sample changes; the compiler's
// memo slots would cost more bytes than they save renders.
"use no memo";

// The landing sections' live parts. Each receives every sample's data from
// the server (data.ts) and renders the one the dock has selected.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { cx } from "@/lib/cx";
import type { ExportSnippets, PairRow, ShowcaseTheme, ThemeId } from "./data";
import { studioPath, useShowcase } from "./showcase";

type Per<K extends keyof ShowcaseTheme> = Record<ThemeId, ShowcaseTheme[K]>;

// ---------------------------------------------------------------------------
// 01 Build: scales

export function ScaleExplorer({
  scales,
  semantic,
}: {
  scales: Per<"scales">;
  semantic: Per<"semantic">;
}) {
  const id = useShowcase();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_20rem] lg:gap-5">
      <div className="surface rounded-xl p-4 shadow-md sm:p-6 md:p-7">
        <div className="grid gap-7 md:gap-8">
          {scales[id].map((scale) => {
            const base = scale.swatches.find((s) => s.base);
            return (
              <div key={scale.name}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-semibold tracking-tight">{scale.name}</h3>
                  <p className="font-mono text-muted-foreground text-xs">
                    {base
                      ? `${base.css} · lands on ${base.step}`
                      : "Tailwind neutral lightness, tinted"}
                  </p>
                </div>
                <ol className="grid grid-cols-11 gap-1 sm:gap-1.5 md:gap-2">
                  {scale.swatches.map((swatch) => (
                    <li key={swatch.step} className="min-w-0">
                      <div
                        className={cx(
                          "relative aspect-[3/4] rounded-[5px] shadow-[inset_0_0_0_1px_oklch(0_0_0/0.07)] transition-colors duration-500 sm:aspect-square sm:rounded-md dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/0.08)]",
                          swatch.base &&
                            "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                        )}
                        style={{ background: swatch.css }}
                        title={`${scale.name} ${swatch.step}: ${swatch.css}`}
                      >
                        <span
                          className={cx(
                            "absolute bottom-1.5 left-2 hidden font-mono text-[0.625rem] tabular-nums md:block",
                            swatch.dark ? "text-white/85" : "text-black/65",
                          )}
                        >
                          {swatch.l.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1.5 text-center font-mono text-[0.5625rem] text-muted-foreground tabular-nums sm:text-[0.6875rem]">
                        {swatch.step}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
        <p className="mt-7 flex items-center gap-2 text-muted-foreground text-xs">
          <span className="size-2.5 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-card" />
          Your colour, untouched. Numbers on swatches are OKLCH lightness.
        </p>
      </div>

      <div className="surface rounded-xl p-4 shadow-md sm:p-6">
        <h3 className="font-semibold tracking-tight">Status colours</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Re-derived for dark mode, never mirrored.
        </p>
        <div className="mt-5 grid gap-5">
          {semantic[id].map(({ mode, colors }) => (
            <div key={mode}>
              <p className="mb-2 text-eyebrow text-muted-foreground">{mode}</p>
              <ul className="grid grid-cols-2 gap-2">
                {colors.map((color) => (
                  <li
                    key={color.name}
                    className="flex items-center gap-2.5 rounded-md bg-sunken p-2 ring-1 ring-edge"
                  >
                    <span
                      className="size-7 shrink-0 rounded-sm shadow-[inset_0_0_0_1px_oklch(0_0_0/0.08)] transition-colors duration-500"
                      style={{ background: color.css }}
                      title={color.css}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-xs capitalize">
                        {color.name}
                      </span>
                      <span className="block font-mono text-[0.625rem] text-muted-foreground">
                        {color.hex}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 02 Validate: contrast

function Stat({
  value,
  label,
  note,
}: {
  value: ReactNode;
  label: string;
  note: string;
}) {
  return (
    <div className="surface rounded-lg p-4 shadow-sm sm:p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 font-semibold text-3xl tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-muted-foreground text-xs">{note}</p>
    </div>
  );
}

function PairSample({ row }: { row: PairRow }) {
  const fg = `var(--${row.fg})`;
  const bg = `var(--${row.bg})`;
  if (row.min > 3) {
    return (
      <span
        className="grid size-10 shrink-0 place-items-center rounded-[calc(var(--radius)*0.8)] font-semibold text-[0.9375rem] shadow-[inset_0_0_0_1px_var(--border)]"
        style={{ background: bg, color: fg }}
      >
        Aa
      </span>
    );
  }
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-[calc(var(--radius)*0.8)] shadow-[inset_0_0_0_1px_var(--border)]"
      style={{ background: bg }}
    >
      <span
        className="size-5 rounded-[calc(var(--radius)*0.5)]"
        style={{ boxShadow: `inset 0 0 0 2px ${fg}` }}
      />
    </span>
  );
}

function ContrastPanel({
  id,
  mode,
  data,
}: {
  id: ThemeId;
  mode: "light" | "dark";
  data: ShowcaseTheme["contrast"]["light"];
}) {
  return (
    <div
      className="tv-scope overflow-hidden rounded-xl bg-background text-foreground shadow-lg ring-1 ring-edge transition-colors duration-500"
      data-theme={id}
      data-mode={mode}
    >
      <div className="flex items-center justify-between border-border border-b px-4 py-3.5 sm:px-5">
        <p className="font-semibold text-sm capitalize">{mode}</p>
        <p className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
          <CheckIcon className="size-3.5 text-foreground" strokeWidth={2.5} />
          {data.passing}/{data.checked} pass
        </p>
      </div>
      <ul className="divide-y divide-border">
        {data.rows.map((row) => (
          <li
            key={`${row.fg}/${row.bg}`}
            className="flex items-center gap-3 px-4 py-3 sm:px-5"
          >
            <PairSample row={row} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[0.75rem]">{row.fg}</p>
              <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">
                on {row.bg}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono font-semibold text-sm tabular-nums">
                {row.ratio.toFixed(2)}:1
              </p>
              <p className="mt-0.5 font-mono text-[0.625rem] text-muted-foreground">
                <span className="rounded-full bg-foreground/8 px-1.5 py-px font-semibold text-foreground">
                  {row.level}
                </span>{" "}
                min {row.min}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContrastExplorer({
  contrast,
  fixes,
  passingBefore,
}: {
  contrast: Per<"contrast">;
  fixes: Per<"fixes">;
  passingBefore: Per<"passingBefore">;
}) {
  const id = useShowcase();
  const { light, dark } = contrast[id];
  const total = light.checked + dark.checked;
  const before = passingBefore[id].light + passingBefore[id].dark;
  const fixed = fixes[id];
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        <Stat
          label="Pairs checked"
          value={total}
          note={`${light.checked} per mode: text, controls, focus, charts`}
        />
        <Stat
          label="Passing before auto-fix"
          value={`${before}/${total}`}
          note="As the theme was typed in"
        />
        <Stat
          label="Passing after"
          value={`${light.passing + dark.passing}/${total}`}
          note={`${fixed.length} token${fixed.length === 1 ? "" : "s"} moved in lightness only`}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <ContrastPanel id={id} mode="light" data={light} />
        <ContrastPanel id={id} mode="dark" data={dark} />
      </div>
      <div className="surface rounded-xl p-4 shadow-sm sm:p-5">
        <p className="font-semibold text-sm">What auto-fix changed</p>
        {fixed.length === 0 ? (
          <p className="mt-2 text-muted-foreground text-sm">
            Nothing: this theme passed every pair as typed.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fixed.map((fix) => (
              <li
                key={`${fix.mode}-${fix.token}`}
                className="flex items-center justify-between gap-3 rounded-md bg-sunken px-3 py-2 ring-1 ring-edge"
              >
                <span className="min-w-0 truncate font-mono text-xs">
                  {fix.token}
                  <span className="text-muted-foreground"> · {fix.mode}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs tabular-nums">
                  <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                    {fix.before.toFixed(2)}
                  </span>
                  <ArrowRightIcon className="size-3 text-muted-foreground" />
                  <span className="font-semibold">{fix.after.toFixed(2)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 03 Share: the link

export function ShareExplorer({
  share,
  defaultLength,
}: {
  share: Per<"share">;
  defaultLength: number;
}) {
  const id = useShowcase();
  const link = share[id];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
      <div className="surface flex flex-col rounded-xl p-4 shadow-md sm:p-6">
        <p className="text-eyebrow text-muted-foreground">Share link</p>
        <p className="mt-4 break-all rounded-lg bg-sunken p-4 font-mono text-[0.8125rem] leading-relaxed ring-1 ring-edge">
          <span className="text-muted-foreground">
            thevio.zubyr.dev/studio?t=
          </span>
          {link.t}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyButton
            text={studioPath(link.t)}
            label="Copy link"
            className="h-10 rounded-full bg-primary px-4 font-medium text-primary-foreground text-sm hover:opacity-90"
          />
          <a
            href={studioPath(link.t)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 font-medium text-sm ring-1 ring-edge transition-colors duration-200 hover:bg-foreground/5"
          >
            Open in Studio <ArrowRightIcon className="size-4" />
          </a>
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-3 border-edge border-t pt-5 max-sm:mt-6">
          <div>
            <dt className="text-muted-foreground text-xs">This theme</dt>
            <dd className="mt-1 font-semibold text-xl tabular-nums tracking-tight">
              {link.length}
              <span className="ml-1 font-normal text-muted-foreground text-xs">
                chars
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Default theme</dt>
            <dd className="mt-1 font-semibold text-xl tabular-nums tracking-tight">
              {defaultLength}
              <span className="ml-1 font-normal text-muted-foreground text-xs">
                chars
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Codec</dt>
            <dd className="mt-1 font-semibold text-xl tracking-tight">
              v1
              <span className="ml-1 font-normal text-muted-foreground text-xs">
                lz
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="surface rounded-xl p-4 shadow-md sm:p-6">
        <p className="text-eyebrow text-muted-foreground">
          What the link carries
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-sunken p-4 font-mono text-[0.75rem] leading-6 ring-1 ring-edge">
          <code>
            <span className="text-muted-foreground">{"{"}</span>
            {"\n"}
            {link.payload.map((line, i) => (
              <span key={line.key} className="block pl-4">
                <span>&quot;{line.key}&quot;</span>
                <span className="text-muted-foreground">: </span>
                {line.value}
                {i < link.payload.length - 1 && (
                  <span className="text-muted-foreground">,</span>
                )}
                <span className="text-muted-foreground/70">
                  {" "}
                  {`// ${line.path}`}
                </span>
              </span>
            ))}
            <span className="text-muted-foreground">{"}"}</span>
          </code>
        </pre>
        <p className="mt-4 text-muted-foreground text-sm leading-relaxed">
          Only fields that differ from the defaults, with short keys and enums
          as indexes. The <span className="font-mono text-foreground">1</span>{" "}
          prefix names the codec, so old links keep working.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 04 Export: code

const FORMATS = [
  { key: "css", label: "CSS", file: "globals.css" },
  { key: "tailwind", label: "Tailwind", file: "theme.css" },
  { key: "scss", label: "SCSS", file: "_theme.scss" },
] as const;

const OKLCH = /oklch\([^)]*\)/;

/** One line of code; line numbers come from CSS (`.code-lines`). */
function CodeLine({ line }: { line: string }) {
  if (/^\s*(\/\*|\*|\/\/)/.test(line)) {
    return <span className="text-muted-foreground/80">{line}</span>;
  }
  const decl = /^(\s*)([-$\w]+)(:\s*)(.*)$/.exec(line);
  if (!decl) return <span>{line}</span>;
  const [, indent, name, colon, value = ""] = decl;
  // Chip only plain colour values, not shadows that merely contain one.
  const color =
    OKLCH.exec(value)?.index === 0 ? OKLCH.exec(value)?.[0] : undefined;
  return (
    <span>
      {indent}
      {name}
      <span className="text-muted-foreground">
        {colon}
        {color && <i className="swatch-chip" style={{ background: color }} />}
        {value}
      </span>
    </span>
  );
}

/**
 * The exporters' real output. Only the default theme's CSS is in the page;
 * every other snippet (`/showcase.json`, built with the site) is fetched
 * when the section comes near the viewport, to keep the HTML small.
 */
export function ExportExplorer({
  initialCss,
  src,
}: {
  initialCss: string;
  src: string;
}) {
  const id = useShowcase();
  const [format, setFormat] = useState<(typeof FORMATS)[number]["key"]>("css");
  const [all, setAll] = useState<Record<ThemeId, ExportSnippets> | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        fetch(src)
          .then((res) => res.json())
          .then(setAll)
          .catch(() => {});
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const code =
    all?.[id][format] ??
    (id === "default" && format === "css" ? initialCss : null);
  const lines = code?.split("\n") ?? [];
  const active = FORMATS.find((f) => f.key === format) ?? FORMATS[0];

  return (
    <div ref={root} className="surface overflow-hidden rounded-xl shadow-xl">
      <div className="flex flex-wrap items-center gap-3 border-edge border-b bg-sunken/60 p-2 pl-3 sm:pl-4">
        <div
          role="tablist"
          aria-label="Export format"
          className="flex rounded-full bg-background p-1 ring-1 ring-edge"
        >
          {FORMATS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={f.key === format}
              aria-controls="export-code"
              onClick={() => setFormat(f.key)}
              className={cx(
                "h-8 rounded-full px-3.5 font-medium text-sm transition-[background-color,color,box-shadow] duration-200 ease-soft",
                f.key === format
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="hidden font-mono text-muted-foreground text-xs sm:block">
          {active.file}
          {code && ` · ${lines.length} lines`}
        </p>
        {code && (
          <CopyButton
            text={code}
            label="Copy"
            className="ml-auto h-9 rounded-full px-3.5 font-medium text-sm ring-1 ring-edge hover:bg-foreground/5"
          />
        )}
      </div>
      <div
        id="export-code"
        role="tabpanel"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable tab panel must be keyboard-reachable (WAI-ARIA tabs; axe scrollable-region-focusable)
        tabIndex={0}
        aria-label={`${active.label} export`}
        aria-busy={!code}
        className="h-112 overflow-auto bg-card p-4 sm:p-5 md:h-136"
      >
        {code ? (
          <pre className="font-mono text-[0.75rem] leading-[1.7]">
            <code className="code-lines">
              {lines.map((line, i) => (
                // Lines are positional; the index is their identity.
                // biome-ignore lint/suspicious/noArrayIndexKey: static lines
                <CodeLine key={i} line={line} />
              ))}
            </code>
          </pre>
        ) : (
          <div className="grid gap-3 pt-1" aria-hidden>
            {[62, 48, 71, 55, 40, 66, 52, 58].map((width) => (
              <div
                key={width}
                className="h-3 animate-pulse rounded-full bg-muted"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
