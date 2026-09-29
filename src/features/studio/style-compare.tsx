"use client";

import { useState } from "react";
import type { ThemeId } from "@/config/sample-themes";
import type { Mode } from "@/core/theme/resolve";
import { cx } from "@/lib/cx";
import { SamplePage } from "../preview/sample-page";
import { ThemeScope } from "../preview/theme-scope";
import type { CompareData } from "./data";

const MODES: Mode[] = ["light", "dark"];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; swatch?: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="surface flex items-center gap-0.5 rounded-full p-1 shadow-xs">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={cx(
              "flex h-8 items-center gap-2 rounded-full px-3 font-medium text-sm capitalize transition-[background-color,color,box-shadow] duration-200 ease-soft",
              on
                ? "bg-background text-foreground shadow-xs ring-1 ring-edge"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.swatch && (
              <span
                aria-hidden
                className="size-3.5 rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.12)]"
                style={{ background: option.swatch }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

/**
 * One theme, three style presets, side by side: the M3 acceptance check.
 * Each column is its own ThemeScope; only the seven component tokens differ.
 */
export function StyleCompare({ data }: { data: CompareData }) {
  const [theme, setTheme] = useState<ThemeId>("default");
  const [mode, setMode] = useState<Mode>("light");
  const themeIds = Object.keys(data.themes) as ThemeId[];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={themeIds.map((id) => ({
            id,
            label: data.themes[id].label,
            swatch: data.themes[id].brand,
          }))}
        />
        <Segmented
          label="Preview mode"
          value={mode}
          onChange={setMode}
          options={MODES.map((id) => ({ id, label: id }))}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 lg:grid-cols-3">
        {data.presets.map((preset) => (
          <section key={preset.id} aria-label={`${preset.label} style`}>
            <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-semibold tracking-tight">{preset.label}</h2>
              <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">
                {preset.tokens.join(" · ")}
              </p>
            </div>
            <div className="surface overflow-hidden rounded-xl p-1.5 shadow-lg">
              <ThemeScope
                scope={data.scopes[theme][preset.id][mode]}
                className="overflow-hidden rounded-[1.125rem]"
              >
                <SamplePage id={`${preset.id}-${theme}-${mode}`} />
              </ThemeScope>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
