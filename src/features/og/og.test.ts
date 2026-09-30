import { describe, expect, it } from "vitest";
import { oklch } from "@/core/color/convert";
import { resolveTheme } from "@/core/theme/resolve";
import { ThemeSchemaV1 } from "@/core/theme/schema";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
import { fontUrlFromCss } from "./fonts";
import { cssColor, ogData, ogText } from "./theme-image";

describe("cssColor", () => {
  it("gives Satori rgb()/rgba(), never oklch()", () => {
    expect(cssColor(oklch(1, 0, 0))).toBe("rgb(255, 255, 255)");
    expect(cssColor(oklch(1, 0, 0, 0.1))).toBe("rgba(255, 255, 255, 0.1)");
  });
});

describe("ogData", () => {
  const theme = ThemeSchemaV1.parse({
    v: 1,
    name: "Grove",
    colors: { brand: "#0f9d74" },
    fonts: { sans: "Manrope", heading: "Fraunces" },
    components: STYLE_PRESETS.soft,
  });
  const data = ogData(resolveTheme(theme));

  it("carries the theme's style, fonts and every colour as plain CSS", () => {
    expect(data.style.buttonShape).toBe("pill");
    expect(data.radius.button).toBe(9999);
    expect(data.fonts).toEqual({ sans: "Manrope", heading: "Fraunces" });
    expect(data.brand).toHaveLength(11);
    expect(JSON.stringify(data)).not.toContain("oklch");
  });

  it("subsets fonts to every character drawn, the name included", () => {
    const text = ogText(data);
    for (const ch of "Grove$48,210") expect(text).toContain(ch);
  });
});

describe("fontUrlFromCss", () => {
  it("takes the TrueType URL from a CSS2 API response", () => {
    const css = `@font-face {
  font-family: 'Manrope';
  src: url(https://fonts.gstatic.com/l/font?kit=abc&skey=1) format('truetype');
}`;
    expect(fontUrlFromCss(css)).toBe(
      "https://fonts.gstatic.com/l/font?kit=abc&skey=1",
    );
    expect(fontUrlFromCss("src: url(x.woff2) format('woff2');")).toBeNull();
  });
});
