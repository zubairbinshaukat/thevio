"use client";

// OKLCH colour picker: L/C/H sliders over live gradients, a text field that
// takes any CSS colour, and a gamut check with a one-click fit to sRGB.

import { useId, useState } from "react";
import {
  formatHex,
  formatOklch,
  type Oklch,
  parseColor,
} from "@/core/color/convert";
import { inGamut, mapToGamut } from "@/core/color/gamut";
import {
  type ColorValue,
  fromColorValue,
  normalizeColor,
} from "@/core/theme/schema";
import { cx } from "@/lib/cx";
import { Slider } from "./controls";
import { AlertIcon } from "./icons";

/** Chroma past this is outside every display gamut at any lightness. */
const MAX_CHROMA = 0.37;

const css = (l: number, c: number, h: number) => `oklch(${l} ${c} ${h})`;

function hueTrack(l: number, c: number): string {
  const stops = Array.from({ length: 13 }, (_, i) => css(l, c, i * 30));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/** What the text field shows: hex when it's exact, else oklch(). */
function describe(color: Oklch): string {
  return inGamut(color) ? formatHex(color) : formatOklch(color);
}

function gamutNote(color: Oklch): string | null {
  if (inGamut(color, "rgb")) return null;
  return inGamut(color, "p3")
    ? "Outside sRGB. Wide-gamut (P3) screens show it; others clip it."
    : "Outside every display gamut. Screens will clip it.";
}

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ColorValue;
  /** Always an opaque, normalised colour. */
  onChange: (value: ColorValue) => void;
}) {
  const id = useId();
  const [l, c, h] = value;

  // Chroma 0 stores hue 0 (grey has no hue). Remember the last real hue, so
  // dragging chroma down to 0 and back up doesn't lose it.
  const [lastHue, setLastHue] = useState(h);
  if (c > 0 && h !== lastHue) setLastHue(h);
  const hue = c > 0 ? h : lastHue;

  // While typing, the field shows the draft; it's applied as soon as it
  // parses, and discarded on blur.
  const [draft, setDraft] = useState<string | null>(null);

  const color = fromColorValue(value);
  const set = (nl: number, nc: number, nh: number) =>
    onChange(normalizeColor(nl, nc, nh));
  const invalid = draft !== null && draft.trim() !== "" && !parseColor(draft);
  const note = gamutNote(color);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-10 shrink-0 rounded-lg shadow-xs ring-1 ring-edge"
          style={{ background: formatOklch(color) }}
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="mb-1 block text-muted-foreground text-xs"
          >
            {label}
          </label>
          <input
            id={id}
            value={draft ?? describe(color)}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(event) => {
              const text = event.currentTarget.value;
              setDraft(text);
              const parsed = parseColor(text);
              if (parsed) set(parsed.l, parsed.c, parsed.h);
            }}
            onBlur={() => setDraft(null)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                setDraft(null);
              }
            }}
            className={cx(
              "h-8 w-full rounded-md bg-sunken px-2 font-mono text-xs ring-1 ring-edge focus-visible:outline-2 focus-visible:outline-ring",
              invalid && "ring-destructive",
            )}
          />
        </div>
      </div>
      {invalid && (
        <p id={`${id}-error`} className="-mt-1 text-destructive text-xs">
          Not a colour. Try #2563eb, rgb(37 99 235) or oklch(0.55 0.2 263).
        </p>
      )}

      <Slider
        label="Lightness"
        value={l}
        min={0}
        max={1}
        step={0.005}
        format={(v) => `${(v * 100).toFixed(1)}%`}
        onChange={(v) => set(v, c, hue)}
        track={`linear-gradient(to right, ${css(0, c, hue)}, ${css(0.5, c, hue)}, ${css(1, c, hue)})`}
      />
      <Slider
        label="Chroma"
        value={Math.min(c, MAX_CHROMA)}
        min={0}
        max={MAX_CHROMA}
        step={0.001}
        format={(v) => v.toFixed(3)}
        onChange={(v) => set(l, v, hue)}
        track={`linear-gradient(to right, ${css(l, 0, hue)}, ${css(l, MAX_CHROMA / 2, hue)}, ${css(l, MAX_CHROMA, hue)})`}
      />
      <Slider
        label="Hue"
        value={hue}
        min={0}
        max={359.9}
        step={0.5}
        format={(v) => `${v.toFixed(1)}°`}
        onChange={(v) => set(l, c, v)}
        track={hueTrack(l, Math.max(c, 0.08))}
      />

      {note && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-warning/12 p-2.5 text-xs"
        >
          <AlertIcon className="mt-px size-3.5 shrink-0 text-warning" />
          <p className="flex-1">{note}</p>
          <button
            type="button"
            onClick={() => {
              const fitted = mapToGamut(color, "rgb");
              set(fitted.l, fitted.c, fitted.h);
            }}
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            Fit to sRGB
          </button>
        </div>
      )}
    </div>
  );
}
