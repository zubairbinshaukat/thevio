import { describe, expect, it } from "vitest";
import { importTheme } from "../import/import";
import { DEFAULT_THEME } from "../theme/defaults";
import { resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import { COLOR_TOKENS } from "../theme/tokens";
import { toCss } from "./css";
import { allExportFiles, EXPORT_FORMATS } from "./formats";
import { toScss } from "./scss";
import { toTailwind } from "./tailwind";

const resolved = resolveTheme(DEFAULT_THEME);
const custom = resolveTheme(
  ThemeSchemaV1.parse({
    v: 1,
    name: "Grove",
    colors: { brand: "#0f9d74", secondary: "#e9a23b" },
    fonts: { sans: 'Ge"ist', mono: "Geist Mono" },
  }),
);

describe("toCss", () => {
  const css = toCss(resolved);

  it("matches the golden output", () => {
    expect(css).toMatchSnapshot();
  });

  it("emits every colour token in both modes and maps it for Tailwind", () => {
    const [root, dark] = css.split(".dark {");
    for (const token of COLOR_TOKENS) {
      expect(root).toContain(`  --${token}: oklch(`);
      expect(dark).toContain(`  --${token}: oklch(`);
      expect(css).toContain(`--color-${token}: var(--${token});`);
    }
  });

  it("uses the unchanged brand as the light primary", () => {
    expect(css).toContain("--primary: oklch(0.5461 0.2152 262.88);");
  });

  it("keeps quotes out of font names", () => {
    expect(toCss(custom)).toContain('--font-sans: "Geist", ui-sans-serif');
  });
});

describe("toTailwind", () => {
  it("emits both 11-step scales with hex fallbacks", () => {
    const out = toTailwind(resolved);
    expect(out.match(/--color-brand-\d+:/g)).toHaveLength(11);
    expect(out.match(/--color-neutral-\d+:/g)).toHaveLength(11);
    expect(out).toContain("/* #2563eb */");
  });

  it("adds the secondary scale only when there is one", () => {
    expect(toTailwind(resolved)).not.toContain("--color-secondary-");
    expect(toTailwind(custom)).toContain("--color-secondary-500:");
  });
});

describe("EXPORT_FORMATS", () => {
  it("gives every format files, with no path used twice", () => {
    const files = allExportFiles(custom);
    for (const format of EXPORT_FORMATS) {
      expect(format.files(custom).length, format.id).toBeGreaterThan(0);
    }
    const paths = files.map((file) => file.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("restores the exact theme from any file that carries the link", () => {
    const grove = resolveTheme(
      ThemeSchemaV1.parse({
        v: 1,
        name: "Grove",
        colors: { brand: "#0f9d74", secondary: "#e9a23b" },
        fonts: { sans: "Manrope", heading: "Fraunces" },
        components: { buttonShape: "pill", tabStyle: "underline" },
      }),
    );
    const withLink = allExportFiles(grove).filter((file) =>
      file.contents.includes("/studio?t="),
    );
    expect(withLink.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "globals.css",
        "_theme.scss",
        "DESIGN.md",
        "tokens/base.tokens.json",
        "registry/grove.json",
      ]),
    );
    for (const file of withLink) {
      const back = importTheme(file.contents);
      expect(back.ok && back.theme, file.path).toEqual(grove.theme);
    }
  });
});

describe("toScss", () => {
  it("emits light tokens, dark twins and scale maps", () => {
    const out = toScss(resolved);
    expect(out).toContain("$primary: oklch(0.5461 0.2152 262.88);");
    expect(out).toContain("$primary-dark: oklch(");
    expect(out).toContain("$brand: (\n  50: oklch(");
  });
});
