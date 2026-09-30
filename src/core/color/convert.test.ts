import { describe, expect, it } from "vitest";
import { formatHex, formatOklch, oklch, parseColor } from "./convert";

describe("parseColor", () => {
  it("reads hex, rgb(), oklch() and named colours", () => {
    expect(formatOklch(parseColor("#ffffff") ?? oklch(0, 0, 0))).toBe(
      "oklch(1 0 0)",
    );
    expect(parseColor("rgb(0 0 0)")?.l).toBeCloseTo(0, 6);
    expect(parseColor("oklch(0.6 0.15 250)")).toEqual(oklch(0.6, 0.15, 250));
    expect(parseColor("  red ")?.h).toBeCloseTo(29.23, 1);
  });

  it("reads hsl() in both syntaxes", () => {
    expect(formatHex(parseColor("hsl(0 0% 100%)") ?? oklch(0, 0, 0))).toBe(
      "#ffffff",
    );
    expect(
      formatHex(parseColor("hsla(221.2, 83.2%, 53.3%, 1)") ?? oklch(0, 0, 0)),
    ).toBe("#2563eb");
  });

  it("keeps alpha and normalises hue", () => {
    const color = parseColor("oklch(0.5 0.1 -30 / 50%)");
    expect(color?.alpha).toBe(0.5);
    expect(color?.h).toBe(330);
  });

  it("returns null for anything it can't read", () => {
    expect(parseColor("not a colour")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("formatOklch", () => {
  it("rounds for output and writes alpha as a percentage", () => {
    expect(formatOklch(oklch(0.123456, 0.098765, 250.4567))).toBe(
      "oklch(0.1235 0.0988 250.46)",
    );
    expect(formatOklch(oklch(1, 0, 0, 0.1))).toBe("oklch(1 0 0 / 10%)");
  });

  it("writes hue 0 for greys, so equal colours print equally", () => {
    expect(formatOklch(oklch(0.5, 0, 123))).toBe("oklch(0.5 0 0)");
  });
});

describe("formatHex", () => {
  it("gives the sRGB hex", () => {
    expect(formatHex(oklch(1, 0, 0))).toBe("#ffffff");
    expect(formatHex(oklch(0, 0, 0))).toBe("#000000");
  });
});
