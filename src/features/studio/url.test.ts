import { describe, expect, it } from "vitest";
import { encodeTheme } from "@/core/codec/encode";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { applyStylePreset, setFont } from "./edits";
import { pageParser, shareUrl, themeParser } from "./url";

const custom = setFont(
  applyStylePreset(DEFAULT_THEME, "crisp"),
  "sans",
  "Lora",
);

describe("themeParser", () => {
  it("round-trips a theme", () => {
    const text = themeParser.serialize(custom);
    expect(themeParser.parse(text)).toEqual(custom);
  });

  it("reads broken, foreign and oversized values as no theme", () => {
    for (const bad of ["", "x", "1", "1!!!", "9abc", `1${"A".repeat(9000)}`]) {
      expect(themeParser.parse(bad)).toBeNull();
    }
  });

  it("treats equal themes as equal", () => {
    expect(themeParser.eq?.(custom, structuredClone(custom))).toBe(true);
    expect(themeParser.eq?.(custom, DEFAULT_THEME)).toBe(false);
  });
});

describe("pageParser", () => {
  it("accepts only known pages", () => {
    expect(pageParser.parse("dashboard")).toBe("dashboard");
    expect(pageParser.parse("admin")).toBeNull();
  });
});

describe("shareUrl", () => {
  const origin = "https://thevio.zubyr.dev";

  it("needs no parameters for the default theme on the first page", () => {
    expect(shareUrl(origin, DEFAULT_THEME)).toBe(`${origin}/studio`);
  });

  it("carries the theme and the page", () => {
    const url = new URL(shareUrl(origin, custom, "sign-in"));
    expect(url.pathname).toBe("/studio");
    expect(url.searchParams.get("t")).toBe(encodeTheme(custom));
    expect(url.searchParams.get("p")).toBe("sign-in");
    expect(themeParser.parse(url.searchParams.get("t") ?? "")).toEqual(custom);
  });
});
