"use client";
// Tiny and rarely re-rendered: the compiler's memo slots aren't worth their bytes.
"use no memo";

import { createContext, type ReactNode, use, useEffect, useState } from "react";
import { ArrowUpRightIcon } from "@/components/icons";
import { cx } from "@/lib/cx";
import type { ThemeId } from "./data";

export type DockTheme = {
  label: string;
  hue: number;
  brand: string;
  /** The share-link value (`?t=`). */
  t: string;
};

/** The Studio URL for a share-link value. */
export const studioPath = (t: string) => `/studio?t=${t}`;

const Active = createContext<ThemeId>("default");
const Select = createContext<(id: ThemeId) => void>(() => {});

/** The sample theme every island on the landing page is showing. */
export function useShowcase(): ThemeId {
  return use(Active);
}

/**
 * Holds the active sample and tints the page with it: `--hue` drives every
 * shadow, glow and neutral tint (globals.css), `--brand` the accents.
 */
export function ShowcaseProvider({
  themes,
  children,
}: {
  themes: Record<ThemeId, DockTheme>;
  children: ReactNode;
}) {
  const [active, setActive] = useState<ThemeId>("default");

  useEffect(() => {
    const style = document.documentElement.style;
    style.setProperty("--hue", String(themes[active].hue));
    style.setProperty("--brand", themes[active].brand);
    return () => {
      style.removeProperty("--hue");
      style.removeProperty("--brand");
    };
  }, [active, themes]);

  return (
    <Active value={active}>
      <Select value={setActive}>{children}</Select>
    </Active>
  );
}

/** Floating theme picker, like Realtime Colors' toolbar. */
export function ThemeDock({ themes }: { themes: Record<ThemeId, DockTheme> }) {
  const active = useShowcase();
  const select = use(Select);
  const ids = Object.keys(themes) as ThemeId[];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 md:bottom-6">
      <div className="surface pointer-events-auto flex items-center gap-1 rounded-full bg-card/85 p-1.5 shadow-lg backdrop-blur-xl backdrop-saturate-150">
        <span className="hidden pr-1 pl-3 text-eyebrow text-muted-foreground sm:block">
          Theme
        </span>
        <fieldset className="flex items-center gap-0.5">
          <legend className="sr-only">Sample theme</legend>
          {ids.map((id) => {
            const theme = themes[id];
            const on = id === active;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                aria-label={`${theme.label} theme`}
                onClick={() => select(id)}
                className={cx(
                  "flex h-9 items-center gap-2 rounded-full px-2.5 font-medium text-sm transition-[background-color,color,box-shadow] duration-300 ease-soft",
                  on
                    ? "bg-background text-foreground shadow-xs ring-1 ring-edge"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.12),inset_0_1px_0_oklch(1_0_0/0.35)]"
                  style={{ background: theme.brand }}
                />
                <span
                  className={cx(
                    on ? "max-sm:sr-only" : "sr-only md:not-sr-only",
                  )}
                >
                  {theme.label}
                </span>
              </button>
            );
          })}
        </fieldset>
        {/* A full load on purpose: the Studio's preloader takes this theme's colour from ?t=. */}
        <a
          href={studioPath(themes[active].t)}
          className="ml-1 flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 font-medium text-primary-foreground text-sm transition-[scale,opacity] duration-200 ease-soft hover:opacity-90 active:scale-95"
        >
          <span className="max-sm:sr-only">Open in Studio</span>
          <ArrowUpRightIcon className="size-4" strokeWidth={2} />
        </a>
      </div>
    </div>
  );
}
