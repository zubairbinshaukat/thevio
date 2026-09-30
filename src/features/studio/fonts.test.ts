import { describe, expect, it } from "vitest";
import { FONTS } from "@/config/fonts";
import {
  cleanFamily,
  findFont,
  fontCssUrl,
  previewCssUrl,
  renameFamilies,
} from "./fonts";

describe("cleanFamily", () => {
  it("accepts Google family names", () => {
    expect(cleanFamily("Inter")).toBe("Inter");
    expect(cleanFamily("  Source   Sans 3 ")).toBe("Source Sans 3");
    expect(cleanFamily("X")).toBe("X");
  });

  it("rejects anything that could break a URL or a CSS string", () => {
    for (const bad of [
      "",
      " ",
      'Inter"',
      "a&family=b",
      "<b>",
      "Inter;",
      "x".repeat(61),
    ]) {
      expect(cleanFamily(bad)).toBeNull();
    }
  });
});

describe("font list", () => {
  it("has unique, valid families", () => {
    const names = FONTS.map((font) => font.family);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) expect(cleanFamily(name)).toBe(name);
  });

  it("finds fonts case-insensitively", () => {
    expect(findFont("jetbrains mono")?.category).toBe("mono");
    expect(findFont("Nope Sans")).toBeUndefined();
  });

  it("includes the schema's default fonts", () => {
    expect(findFont("Inter")).toBeDefined();
    expect(findFont("JetBrains Mono")).toBeDefined();
  });
});

describe("URLs", () => {
  it("builds a CSS2 URL with the axis spec", () => {
    expect(fontCssUrl("Source Sans 3", "400..700")).toBe(
      "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400..700&display=swap",
    );
    expect(fontCssUrl("Anton")).toBe(
      "https://fonts.googleapis.com/css2?family=Anton&display=swap",
    );
  });

  it("subsets previews to the glyphs of the names", () => {
    const url = new URL(previewCssUrl(["Inter", "Lora"]));
    expect(url.searchParams.getAll("family")).toEqual(["Inter", "Lora"]);
    expect(url.searchParams.get("text")).toBe("ILaenort");
  });
});

describe("renameFamilies", () => {
  it("prefixes every family so subsets never shadow the real font", () => {
    const css = `@font-face {\n  font-family: 'Inter';\n  src: url(a.woff2);\n}\n@font-face { font-family: "Lora"; }`;
    expect(renameFamilies(css)).toBe(
      `@font-face {\n  font-family: 'tvp Inter';\n  src: url(a.woff2);\n}\n@font-face { font-family: "tvp Lora"; }`,
    );
  });
});
