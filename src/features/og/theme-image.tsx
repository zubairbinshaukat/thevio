// The share image for a theme: light mode on the left, dark on the right,
// each drawn in the theme's own component style (button shape and style,
// input style, card surface) with its fonts. Rendered by Satori, which has
// no oklch(), so every colour is converted to rgb() first.

import { MARK } from "@/config/brand";
import { type Oklch, toRgb } from "@/core/color/convert";
import { mapToGamut } from "@/core/color/gamut";
import { STEPS } from "@/core/color/scale";
import type { Mode, ResolvedTheme } from "@/core/theme/resolve";

const SCALE = 1.4; // UI is drawn larger than life so it reads in a thumbnail.

export function cssColor(color: Oklch): string {
  const { r, g, b } = toRgb(mapToGamut(color));
  const [R, G, B] = [r, g, b].map((v) => Math.round(v * 255));
  const alpha = color.alpha ?? 1;
  return alpha >= 1
    ? `rgb(${R}, ${G}, ${B})`
    : `rgba(${R}, ${G}, ${B}, ${Math.round(alpha * 1000) / 1000})`;
}

/** `0.625rem` / `9999px` → px at the image's scale. */
function px(value: string | undefined, scale = SCALE): number {
  const n = Number.parseFloat(value ?? "0") || 0;
  if (value?.endsWith("rem")) return n * 16 * scale;
  return value?.endsWith("px") && n < 9999 ? n * scale : n;
}

export type OgData = ReturnType<typeof ogData>;

/** Everything the image draws, as plain CSS values. */
export function ogData(resolved: ResolvedTheme) {
  const { components } = resolved;
  const palette = (mode: Mode) => {
    const c = resolved.colors[mode];
    const k = components.colors[mode];
    return {
      bg: cssColor(c.background),
      fg: cssColor(c.foreground),
      muted: cssColor(c.muted),
      mutedFg: cssColor(c["muted-foreground"]),
      card: cssColor(c.card),
      border: cssColor(c.border),
      input: cssColor(c.input),
      primary: cssColor(c.primary),
      primaryFg: cssColor(c["primary-foreground"]),
      secondary: cssColor(c.secondary),
      secondaryFg: cssColor(c["secondary-foreground"]),
      softBg: cssColor(k.softBg),
      softFg: cssColor(k.softFg),
      primaryText: cssColor(k.primaryText),
      field: cssColor(k.field),
      line: cssColor(k.line),
      charts: (
        ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const
      ).map((token) => cssColor(c[token])),
    };
  };
  const radius = resolved.radius.base * 16 * SCALE;
  const buttonRadius = px(components.vars["--tv-btn-radius"]);
  return {
    name: resolved.theme.name,
    fonts: { sans: resolved.fonts.sans, heading: resolved.fonts.heading },
    light: palette("light"),
    dark: palette("dark"),
    brand: STEPS.map((step) => cssColor(resolved.scales.brand[step])),
    style: components.tokens,
    radius: {
      button: buttonRadius,
      input:
        components.tokens.inputStyle === "underline"
          ? 0
          : Math.min(buttonRadius, radius * 1.2),
      card: radius * 1.4,
    },
    shadow: resolved.shadowLayers.md
      .map(
        (l) =>
          `${l.x}px ${l.y * 2}px ${l.blur * 2}px ${l.spread}px ${cssColor(l.color)}`,
      )
      .join(", "),
  };
}

/** Every character the image draws: the font subsets hold only these. */
export function ogText(data: OgData): string {
  return `${data.name}ThevioLightDarkWCAG-checked shadcn/ui themeGet startedPreviewname@company.comRevenue$48,210+12.4% this month·`;
}

type Palette = OgData["light"];

function Button({
  data,
  p,
  label,
}: {
  data: OgData;
  p: Palette;
  label: string;
}) {
  const style = {
    solid: {
      background: p.primary,
      color: p.primaryFg,
      border: "2px solid transparent",
    },
    soft: {
      background: p.softBg,
      color: p.softFg,
      border: "2px solid transparent",
    },
    outline: {
      background: "transparent",
      color: p.primaryText,
      border: `2px solid ${p.primary}`,
    },
  }[data.style.buttonStyle];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 56,
        padding: "0 30px",
        borderRadius: data.radius.button,
        fontSize: 22,
        fontWeight: 500,
        ...style,
      }}
    >
      {label}
    </div>
  );
}

function Input({ data, p }: { data: OgData; p: Palette }) {
  const r = data.radius.input;
  const style = {
    outline: {
      border: `2px solid ${p.input}`,
      borderRadius: r,
      padding: "0 20px",
    },
    filled: {
      background: p.field,
      borderBottom: `2px solid ${p.line}`,
      borderRadius: `${r}px ${r}px 0 0`,
      padding: "0 20px",
    },
    underline: { borderBottom: `2px solid ${p.line}`, padding: "0 2px" },
  }[data.style.inputStyle];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: 290,
        height: 56,
        fontSize: 22,
        color: p.mutedFg,
        ...style,
      }}
    >
      name@company.com
    </div>
  );
}

function Card({ data, p }: { data: OgData; p: Palette }) {
  const surface = data.style.surfaceStyle;
  const bars = [55, 95, 72, 120, 88];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 30,
        borderRadius: data.radius.card,
        background: surface === "flat" ? p.muted : p.card,
        border:
          surface === "border" || surface === "both"
            ? `2px solid ${p.border}`
            : "2px solid transparent",
        boxShadow:
          surface === "shadow" || surface === "both" ? data.shadow : "none",
      }}
    >
      <div style={{ display: "flex", fontSize: 20, color: p.mutedFg }}>
        Revenue
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Heading",
          fontSize: 44,
          fontWeight: 600,
          color: p.fg,
        }}
      >
        $48,210
      </div>
      <div style={{ display: "flex", fontSize: 18, color: p.mutedFg }}>
        +12.4% this month
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          height: 130,
          marginTop: 8,
        }}
      >
        {p.charts.map((color, i) => (
          <div
            key={color + String(i)}
            style={{
              display: "flex",
              width: 44,
              height: bars[i],
              background: color,
              borderRadius: Math.min(8, data.radius.button),
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ThemeImage({ data }: { data: OgData }) {
  const { light: l, dark: d } = data;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        fontFamily: "Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 740,
          padding: 60,
          background: l.bg,
          color: l.fg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            color: l.mutedFg,
          }}
        >
          <svg
            aria-hidden
            width={30}
            height={27}
            viewBox={`0 0 ${MARK.width} ${MARK.height}`}
            fill={l.fg}
          >
            {MARK.paths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          Thevio
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Heading",
              fontSize: 80,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {data.name}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: l.mutedFg }}>
            shadcn/ui theme · Light · Dark · WCAG-checked
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Button data={data} p={l} label="Get started" />
          <Input data={data} p={l} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {data.brand.map((color) => (
            <div
              key={color}
              style={{
                display: "flex",
                width: 51,
                height: 30,
                borderRadius: 6,
                background: color,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 22,
          width: 460,
          padding: 50,
          background: d.bg,
          color: d.fg,
        }}
      >
        <Card data={data} p={d} />
        <div style={{ display: "flex", gap: 12 }}>
          <Button data={data} p={d} label="Preview" />
        </div>
      </div>
    </div>
  );
}
