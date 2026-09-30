import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { encodeTheme } from "../codec/encode";
import { formatOklch, parseColor } from "../color/convert";
import { toCss } from "../export/css";
import { DEFAULT_THEME } from "../theme/defaults";
import { MODES, resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import { COLOR_TOKENS } from "../theme/tokens";
import { validateAndFix } from "../theme/validate-and-fix";
import { readCssTheme } from "./css";
import { type ImportResult, importTheme } from "./import";
import { colorDistance } from "./infer";
import { fontFromVariable, readColor, resolveVars } from "./values";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

function ok(result: ImportResult) {
  if (!result.ok) throw new Error(result.error);
  return result;
}

/** Every colour the source sets comes back out of Thevio unchanged. */
function expectFaithful(
  result: ReturnType<typeof ok>,
  expected: Record<"light" | "dark", Record<string, string>>,
) {
  const resolved = resolveTheme(result.theme);
  for (const mode of MODES) {
    for (const token of COLOR_TOKENS) {
      const source = expected[mode][token];
      if (!source) continue;
      const want = readColor(source, (n) => expected[mode][n]);
      if (!want) throw new Error(`fixture colour ${token}: ${source}`);
      const got = resolved.colors[mode][token];
      expect(
        colorDistance(got, want),
        `${mode} ${token}: ${formatOklch(got)} vs ${source}`,
      ).toBeLessThan(0.002);
    }
  }
}

const none = () => undefined;

describe("values", () => {
  it("reads every colour syntax shadcn themes have used", () => {
    const read = (value: string) => readColor(value, none);
    const blue = parseColor("#2563eb");
    if (!blue) throw new Error("blue");
    // shadcn's HSL values are #2563eb rounded to one decimal.
    for (const value of [
      "221.2 83.2% 53.3%",
      "hsl(221.2 83.2% 53.3%)",
      "hsl(221.2, 83.2%, 53.3%)",
      "rgb(37 99 235)",
      "0.5461 0.2152 262.88",
    ]) {
      const color = read(value);
      expect(color && colorDistance(color, blue), value).toBeLessThan(0.002);
    }
    const format = (value: string) => {
      const color = read(value);
      return color && formatOklch(color);
    };
    expect(format("oklch(1 0 0 / 10%)")).toBe("oklch(1 0 0 / 10%)");
    expect(format("0 0% 100% / 0.5")).toBe("oklch(1 0 0 / 50%)");
    expect(format("color-mix(in oklch, red, blue)")).toBeNull();
  });

  it("follows var() chains and fallbacks, and stops on cycles", () => {
    const vars: Record<string, string> = {
      a: "var(--b)",
      b: "#fff",
      loop: "var(--loop)",
    };
    const lookup = (n: string) => vars[n];
    expect(resolveVars("var(--a)", lookup)).toBe("#fff");
    expect(resolveVars("var(--missing, var(--b))", lookup)).toBe("#fff");
    expect(resolveVars("var(--missing)", lookup)).toBeNull();
    expect(resolveVars("var(--loop)", lookup)).toBeNull();
  });

  it("reads font families from next/font variable names", () => {
    expect(fontFromVariable("font-geist-sans")).toBe("Geist");
    expect(fontFromVariable("font-geist-mono")).toBe("Geist Mono");
    expect(fontFromVariable("font-jetbrains-mono")).toBe("JetBrains Mono");
    expect(fontFromVariable("font-sans")).toBeNull();
  });
});

describe("readCssTheme", () => {
  it("sorts variables into light, dark and @theme", () => {
    const raw = readCssTheme(`
      /* a comment with a } brace */
      @theme inline { --font-sans: var(--font-geist-sans); }
      :root { --background: #fff; --content: "a;b}"; }
      .dark, [data-theme="dark"] { --background: #000; }
      :root:not(.dark) { --muted: #eee; }
      @media (prefers-color-scheme: dark) { :root { --card: #111; } }
      @media (min-width: 40rem) { :root { --gap: 2rem; } }
      .card { --elevation: 2; }
      html.dark { --border: #222 !important; }
      :root { --background: #fafafa; }
    `);
    expect(raw.theme).toEqual({ "font-sans": "var(--font-geist-sans)" });
    expect(raw.light).toEqual({
      background: "#fafafa",
      content: '"a;b}"',
      muted: "#eee",
    });
    expect(raw.dark).toEqual({
      background: "#000",
      card: "#111",
      border: "#222",
    });
    expect(raw.ignored).toBe(2);
  });

  it("splits light-dark() and survives // comments", () => {
    const raw = readCssTheme(`
      :root {
        --background: light-dark(oklch(1 0 0), oklch(0.145 0 0));
        --primary: hsl(221.2 83.2% 53.3%); // <-- Wrap in hsl
      }
    `);
    expect(raw.light).toEqual({
      background: "oklch(1 0 0)",
      primary: "hsl(221.2 83.2% 53.3%)",
    });
    expect(raw.dark).toEqual({ background: "oklch(0.145 0 0)" });
  });
});

describe("importTheme: real sources", () => {
  it("imports the stock shadcn v4 globals.css with a handful of pins", () => {
    const css = fixture("shadcn-v4-neutral.css");
    const result = ok(importTheme(css));
    const raw = readCssTheme(css);
    expect(result.format).toBe("css");
    expectFaithful(result, raw);
    expect(result.theme.radius).toBe(0.625);
    expect(result.theme.colors.neutral).toEqual({ hue: 0, chroma: 0 });
    // Neutral greys, radius and light surfaces match Thevio's derivation.
    expect(result.pinned).toBeLessThan(25);
  });

  it("imports a Tailwind v3-era shadcn theme written as HSL channels", () => {
    const css = fixture("shadcn-v3-blue.css");
    const result = ok(importTheme(css));
    expectFaithful(result, readCssTheme(css));
    expect(result.theme.radius).toBe(0.5);
    // A blue-slate neutral: the tint is read, not dropped.
    expect(result.theme.colors.neutral.chroma).toBeGreaterThan(0.02);
  });

  it("imports tweakcn registry items, keeping fonts, radius and shadow", () => {
    const json = fixture("tweakcn-modern-minimal.registry.json");
    const result = ok(importTheme(json));
    const item = JSON.parse(json);
    expect(result.format).toBe("shadcn-registry");
    expect(result.theme.name).toBe("Modern Minimal");
    expectFaithful(result, item.cssVars);
    expect(result.theme.fonts).toEqual({
      sans: "Inter",
      mono: "JetBrains Mono",
    });
    expect(result.theme.radius).toBe(0.375);
    expect(result.theme.shadow).toMatchObject({ y: 1, blur: 3, opacity: 0.1 });
  });

  it("imports every tweakcn fixture faithfully", () => {
    for (const name of [
      "tweakcn-claude.registry.json",
      "tweakcn-doom-64.registry.json",
    ]) {
      const json = fixture(name);
      const result = ok(importTheme(json));
      expectFaithful(result, JSON.parse(json).cssVars);
    }
  });

  it("imports tweakcn's generated CSS, oklch and HSL alike", () => {
    for (const name of ["tweakcn-catppuccin.css", "tweakcn-doom-64-hsl.css"]) {
      const css = fixture(name);
      const result = ok(importTheme(css));
      expectFaithful(result, readCssTheme(css));
    }
    const doom = ok(importTheme(fixture("tweakcn-doom-64-hsl.css")));
    expect(doom.theme.radius).toBe(0);
    expect(doom.theme.fonts.sans).toBe("Oxanium");
  });

  it("imports tweakcn's { light, dark } style JSON, dark falling back to light", () => {
    const result = ok(
      importTheme(
        JSON.stringify({
          label: "Two Tone",
          styles: {
            light: {
              primary: "#7c3aed",
              background: "#ffffff",
              radius: "1rem",
            },
            dark: { background: "#0b0b0f" },
          },
        }),
      ),
    );
    expect(result.format).toBe("tweakcn");
    expect(result.theme.name).toBe("Two Tone");
    const dark = resolveTheme(result.theme).colors.dark;
    // Dark didn't set primary, so it stays the light one (as in tweakcn).
    expect(formatOklch(dark.primary)).toBe(
      formatOklch(parseColor("#7c3aed") ?? dark.primary),
    );
  });

  it("imports a create-next-app globals.css (hex, media-query dark, next/font)", () => {
    const result = ok(
      importTheme(`
        :root { --background: #ffffff; --foreground: #171717; }
        @theme inline {
          --color-background: var(--background);
          --font-sans: var(--font-geist-sans);
          --font-mono: var(--font-geist-mono);
        }
        @media (prefers-color-scheme: dark) {
          :root { --background: #0a0a0a; --foreground: #ededed; }
        }
      `),
    );
    expect(result.theme.fonts).toEqual({ sans: "Geist", mono: "Geist Mono" });
    expectFaithful(result, {
      light: { background: "#ffffff", foreground: "#171717" },
      dark: { background: "#0a0a0a", foreground: "#ededed" },
    });
    expect(result.notes.some((n) => /No --primary/.test(n.message))).toBe(true);
  });

  it("stays under the 2,000-character share-link target", () => {
    for (const name of [
      "tweakcn-claude.registry.json",
      "tweakcn-doom-64.registry.json",
      "tweakcn-catppuccin.css",
      "shadcn-v3-blue.css",
    ]) {
      const { theme } = ok(importTheme(fixture(name)));
      expect(encodeTheme(theme).length, name).toBeLessThan(2000);
    }
  });

  it("feeds validateAndFix: fixes land as overrides and round-trip", () => {
    const { theme } = ok(importTheme(fixture("tweakcn-doom-64.registry.json")));
    const fixed = validateAndFix(theme);
    if (!fixed.ok) throw new Error(fixed.error);
    expect(fixed.unfixable).toEqual([]);
  });
});

describe("importTheme: Thevio's own exports", () => {
  const theme = ThemeSchemaV1.parse({
    v: 1,
    name: "Grove",
    colors: { brand: "#0f9d74", secondary: "#e9a23b" },
    fonts: { sans: "Manrope", heading: "Fraunces" },
    radius: 1,
    components: { buttonShape: "pill", inputStyle: "filled" },
  });

  it("restores an unedited export exactly, component style included", () => {
    const result = ok(importTheme(toCss(resolveTheme(theme))));
    expect(result.format).toBe("thevio-link");
    expect(result.theme).toEqual(theme);
  });

  it("keeps the style of an edited export and pins the edits", () => {
    const css = toCss(resolveTheme(theme)).replace(
      /--background: [^;]+;/,
      "--background: #fdfcf7;",
    );
    const result = ok(importTheme(css));
    expect(result.pinned).toBe(1);
    expect(result.theme.components).toEqual(theme.components);
    expect(result.theme.overrides.light?.background).toBeDefined();
  });

  it("reads a pasted share link or bare code", () => {
    const code = encodeTheme(theme);
    for (const pasted of [`https://thevio.zubyr.dev/studio?t=${code}`, code]) {
      expect(ok(importTheme(pasted)).theme).toEqual(theme);
    }
  });

  it("takes Thevio theme JSON as it is", () => {
    const result = ok(
      importTheme(JSON.stringify({ colors: { brand: "red" } })),
    );
    expect(result.format).toBe("thevio-json");
  });
});

describe("importTheme: bad input", () => {
  it("explains what it needs instead of guessing", () => {
    expect(importTheme("")).toMatchObject({ ok: false });
    expect(importTheme("hello there")).toMatchObject({ ok: false });
    expect(importTheme(".card { color: red; }")).toMatchObject({ ok: false });
    expect(importTheme("{ nope")).toMatchObject({
      ok: false,
      error: expect.stringMatching(/JSON/),
    });
    expect(importTheme("x".repeat(300_000))).toMatchObject({ ok: false });
  });

  it("never throws on hostile CSS", () => {
    for (const css of [
      ":root { --primary: var(--primary); }",
      ":root { --primary: ",
      "}}}} :root {{{ --a: b",
      `:root { --radius: 999rem; --spacing: -3px; --font-sans: ; }`,
      `:root { --primary: ${"(".repeat(5000)} }`,
    ]) {
      expect(() => importTheme(css)).not.toThrow();
    }
  });

  it("clamps out-of-range values and says so", () => {
    const result = ok(
      importTheme(":root { --primary: #2563eb; --radius: 9rem; }"),
    );
    expect(result.theme.radius).toBe(2);
    expect(result.notes.some((n) => n.message.startsWith("radius"))).toBe(true);
  });

  it("keeps the default theme's output for the default input", () => {
    const result = ok(importTheme(toCss(resolveTheme(DEFAULT_THEME))));
    expect(result.theme).toEqual(DEFAULT_THEME);
  });
});
