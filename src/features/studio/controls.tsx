"use client";

// Small building blocks for the Studio's control panel. Chrome-styled
// (globals.css tokens), never theme-styled: the theme only paints the preview.

import {
  type CSSProperties,
  createContext,
  type ReactNode,
  use,
  useId,
} from "react";
import { cx } from "@/lib/cx";

/**
 * The Studio's root element. Its stylesheet only applies inside `.tv-studio`
 * (scripts/postcss-scope-utilities.mjs), so popovers portal here, not into
 * <body>. Null until the root mounts; popovers only open after that.
 */
export const StudioRoot = createContext<HTMLElement | null>(null);

export function useStudioRoot(): HTMLElement | undefined {
  return use(StudioRoot) ?? undefined;
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-edge border-b px-4 py-5">
      <div className="mb-3.5 flex min-h-6 items-center justify-between gap-3">
        <h2 id={id} className="font-medium text-sm">
          {title}
        </h2>
        {action}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

type Option<T extends string> = {
  id: T;
  label: string;
  /** Icon-only options show this, and use `label` as the accessible name. */
  icon?: ReactNode;
};

/** A row of toggle buttons; exactly one is pressed. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  size = "md",
  className,
}: {
  label: string;
  value: T | null;
  options: readonly Option<T>[];
  onChange: (id: T) => void;
  hideLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <fieldset className={cx("min-w-0", className)}>
      <legend
        className={cx(
          "mb-1.5 text-muted-foreground text-xs",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </legend>
      <div className="flex rounded-lg bg-sunken p-0.5 ring-1 ring-edge">
        {options.map((option) => {
          const on = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              aria-label={option.icon ? option.label : undefined}
              title={option.icon ? option.label : undefined}
              onClick={() => onChange(option.id)}
              className={cx(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 font-medium transition-[background-color,color,box-shadow] duration-200 ease-soft",
                size === "sm" ? "h-7 text-xs" : "h-8 text-[0.8125rem]",
                on
                  ? "bg-card text-foreground shadow-xs ring-1 ring-edge"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.icon ?? option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * A labelled native range: keyboard, touch and screen readers work as-is.
 * `track` paints the rail (e.g. a gradient of the values it picks).
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  track,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  track?: string;
}) {
  const id = useId();
  const text = format(value);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-muted-foreground text-xs">
          {label}
        </label>
        <output
          htmlFor={id}
          className="font-mono text-[0.6875rem] text-muted-foreground tabular-nums"
        >
          {text}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        className="range"
        style={track ? ({ "--track": track } as CSSProperties) : undefined}
      />
    </div>
  );
}

/** A small chrome button: icon, or icon + text. */
export function ToolButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 font-medium text-[0.8125rem] text-muted-foreground transition-[color,background-color,scale] duration-200 ease-soft hover:bg-foreground/6 hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
