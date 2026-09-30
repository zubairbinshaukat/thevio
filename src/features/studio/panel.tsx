"use client";

// The Studio's control panel: every edit goes through `edit`, one history
// group per control, so a drag or a burst of typing undoes in one step.

import { useId, useState } from "react";
import { CheckIcon } from "@/components/icons";
import {
  BUTTON_SHAPES,
  BUTTON_STYLES,
  DENSITIES,
  FOCUS_RINGS,
  INPUT_STYLES,
  SURFACE_STYLES,
  TAB_STYLES,
  type Theme,
} from "@/core/theme/schema";
import {
  type ComponentTokens,
  matchStylePreset,
  type StylePresetName,
} from "@/core/theme/style-presets";
import { cx } from "@/lib/cx";
import { ColorPicker } from "./color-picker";
import type { ContrastReport } from "./contrast";
import { Section, Segmented, Slider } from "./controls";
import {
  applyStylePreset,
  clearPins,
  fixAllContrast,
  pinCount,
  setBrand,
  setComponent,
  setFont,
  setNeutral,
} from "./edits";
import { FontPicker } from "./font-picker";
import { AlertIcon, WandIcon } from "./icons";
import { type Edit, useFontStatus } from "./use-studio";

const PRESETS: { id: StylePresetName; label: string }[] = [
  { id: "shadcn", label: "shadcn" },
  { id: "soft", label: "Soft" },
  { id: "crisp", label: "Crisp" },
];

const TOKEN_CONTROLS: {
  key: keyof ComponentTokens;
  label: string;
  values: readonly string[];
}[] = [
  { key: "surfaceStyle", label: "Surfaces", values: SURFACE_STYLES },
  { key: "density", label: "Density", values: DENSITIES },
  { key: "buttonShape", label: "Button shape", values: BUTTON_SHAPES },
  { key: "buttonStyle", label: "Button style", values: BUTTON_STYLES },
  { key: "inputStyle", label: "Inputs", values: INPUT_STYLES },
  { key: "focusRing", label: "Focus", values: FOCUS_RINGS },
  { key: "tabStyle", label: "Tabs", values: TAB_STYLES },
];

const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const hueStops = (l: number, c: number) =>
  `linear-gradient(to right, ${Array.from(
    { length: 13 },
    (_, i) => `oklch(${l} ${c} ${i * 30})`,
  ).join(", ")})`;

function ContrastSection({
  theme,
  report,
  edit,
}: {
  theme: Theme;
  report: ContrastReport;
  edit: (fn: Edit, group?: string) => void;
}) {
  const failing = report.failing.length;
  const pins = pinCount(theme);
  // Set when "Fix all" found nothing it could move for this exact theme.
  const [stuck, setStuck] = useState<Theme | null>(null);

  function fixAll() {
    const result = fixAllContrast(theme);
    if (result.fixed === 0) setStuck(theme);
    else edit(() => result.theme);
  }
  return (
    <Section title="Contrast">
      <div
        role="status"
        className={cx(
          "flex items-start gap-2 rounded-lg p-3 text-sm",
          failing ? "bg-warning/12" : "bg-success/10",
        )}
      >
        {failing ? (
          <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
        ) : (
          <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
        )}
        <p>
          {failing
            ? `${failing} of ${report.checked} pairs fail WCAG 2.`
            : `All ${report.checked} pairs pass WCAG 2 in light and dark.`}
        </p>
      </div>
      {failing > 0 && (
        <>
          <ul className="grid gap-1 font-mono text-[0.6875rem] text-muted-foreground">
            {report.failing.slice(0, 6).map((pair) => (
              <li
                key={`${pair.mode}-${pair.fg}-${pair.bg}`}
                className="flex justify-between gap-2"
              >
                <span className="truncate">
                  {pair.mode} · {pair.fg} on {pair.bg}
                </span>
                <span className="shrink-0 tabular-nums">
                  {pair.ratio.toFixed(2)} / {pair.min}
                </span>
              </li>
            ))}
            {failing > 6 && <li>and {failing - 6} more</li>}
          </ul>
          <button
            type="button"
            onClick={fixAll}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
          >
            <WandIcon className="size-4" />
            Fix all
          </button>
          <p className="text-muted-foreground text-xs">
            {stuck === theme
              ? "Nothing here can be fixed automatically. Try a darker or lighter brand colour."
              : "Moves each failing colour the least it can, and pins it. Undo reverts it."}
          </p>
        </>
      )}
      {pins > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            {pins} pinned colour{pins === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => edit(clearPins)}
            className="font-medium underline underline-offset-2 hover:no-underline"
          >
            Unpin all
          </button>
        </div>
      )}
    </Section>
  );
}

export function Panel({
  theme,
  report,
  edit,
}: {
  theme: Theme;
  report: ContrastReport;
  edit: (fn: Edit, group?: string) => void;
}) {
  const nameId = useId();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const preset = matchStylePreset(theme.components);
  const { sans, mono, heading } = theme.fonts;
  const sansStatus = useFontStatus(sans);
  const monoStatus = useFontStatus(mono);
  const headingStatus = useFontStatus(heading);
  const neutral = theme.colors.neutral;

  return (
    <div>
      <div className="border-edge border-b px-4 py-4">
        <label
          htmlFor={nameId}
          className="mb-1 block text-muted-foreground text-xs"
        >
          Theme name
        </label>
        <input
          id={nameId}
          // The schema trims names; show the draft while typing so a space
          // between words isn't eaten before the next letter arrives.
          value={nameDraft ?? theme.name}
          maxLength={40}
          placeholder="Untitled"
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            const name = event.currentTarget.value;
            setNameDraft(name);
            edit((t) => ({ ...t, name }), "name");
          }}
          onBlur={() => setNameDraft(null)}
          className="h-9 w-full rounded-lg bg-sunken px-2.5 font-medium text-sm ring-1 ring-edge focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      <Section title="Brand colour">
        <ColorPicker
          label="Colour"
          value={theme.colors.brand}
          onChange={(value) => edit((t) => setBrand(t, value), "brand")}
        />
      </Section>

      <Section title="Neutrals">
        <Slider
          label="Tint hue"
          value={neutral.hue}
          min={0}
          max={359.9}
          step={0.5}
          format={(v) => `${v.toFixed(1)}°`}
          onChange={(hue) => edit((t) => setNeutral(t, { hue }), "neutral-hue")}
          track={hueStops(0.7, 0.08)}
        />
        <Slider
          label="Tint strength"
          value={neutral.chroma}
          min={0}
          max={0.05}
          step={0.001}
          format={(v) => (v === 0 ? "Pure grey" : v.toFixed(3))}
          onChange={(chroma) =>
            edit((t) => setNeutral(t, { chroma }), "neutral-chroma")
          }
          track={`linear-gradient(to right, oklch(0.7 0 0), oklch(0.7 0.05 ${neutral.hue}))`}
        />
      </Section>

      <Section title="Typography">
        <FontPicker
          label="Body"
          value={sans}
          prefer="sans"
          status={sansStatus}
          onChange={(family) => edit((t) => setFont(t, "sans", family))}
        />
        <FontPicker
          label="Headings"
          value={heading ?? null}
          prefer="sans"
          status={headingStatus}
          inheritLabel="Same as body"
          onChange={(family) => edit((t) => setFont(t, "heading", family))}
        />
        <FontPicker
          label="Code"
          value={mono}
          prefer="mono"
          status={monoStatus}
          onChange={(family) => edit((t) => setFont(t, "mono", family))}
        />
      </Section>

      <Section title="Shape">
        <Slider
          label="Radius"
          value={theme.radius}
          min={0}
          max={2}
          step={0.025}
          format={(v) => `${Number(v.toFixed(3))}rem · ${Math.round(v * 16)}px`}
          onChange={(radius) => edit((t) => ({ ...t, radius }), "radius")}
        />
      </Section>

      <Section
        title="Component style"
        action={
          preset === null && (
            <span className="text-muted-foreground text-xs">Custom</span>
          )
        }
      >
        <Segmented
          label="Preset"
          value={preset}
          options={PRESETS}
          onChange={(name) => edit((t) => applyStylePreset(t, name))}
        />
        {TOKEN_CONTROLS.map(({ key, label, values }) => (
          <Segmented
            key={key}
            label={label}
            size="sm"
            value={theme.components[key]}
            options={values.map((value) => ({
              id: value,
              label: title(value),
            }))}
            onChange={(value) =>
              edit((t) =>
                setComponent(t, key, value as ComponentTokens[typeof key]),
              )
            }
          />
        ))}
      </Section>

      <ContrastSection theme={theme} report={report} edit={edit} />
    </div>
  );
}
