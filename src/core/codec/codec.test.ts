import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "../theme/defaults";
import {
  BUTTON_SHAPES,
  BUTTON_STYLES,
  CHART_STYLES,
  DENSITIES,
  FOCUS_RINGS,
  INPUT_STYLES,
  RING_SOURCES,
  SURFACE_STYLES,
  TAB_STYLES,
  type Theme,
  ThemeSchemaV1,
} from "../theme/schema";
import { COLOR_TOKENS } from "../theme/tokens";
import { decodeTheme, MAX_ENCODED_LENGTH } from "./decode";
import { flatten } from "./diff";
import { encodeTheme } from "./encode";
import { FIELD_KEYS, keyForPath, pathForKey } from "./keys";

// Seeded PRNG (mulberry32), so failures reproduce.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomTheme(seed: number): Theme {
  const r = rng(seed);
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(r() * list.length)] as T;
  const num = (min: number, max: number, digits = 3) =>
    Number((min + r() * (max - min)).toFixed(digits));
  const maybe = <T>(make: () => T) => (r() < 0.5 ? make() : undefined);
  const color = () =>
    r() < 0.2
      ? [num(0, 1, 4), num(0, 0.3, 4), num(0, 359, 2), num(0, 1, 3)]
      : [num(0, 1, 4), num(0, 0.3, 4), num(0, 359, 2)];
  const overrides = () =>
    Object.fromEntries(
      COLOR_TOKENS.filter(() => r() < 0.2).map((token) => [token, color()]),
    );

  return ThemeSchemaV1.parse({
    v: 1,
    name: maybe(() => pick(["Ocean", "Dusk ✨", "Café", "a b c"])),
    colors: {
      brand: color(),
      neutral: maybe(() => ({ hue: num(0, 360, 2), chroma: num(0, 0.05, 4) })),
      secondary: maybe(color),
      semantic: maybe(() => ({ danger: color(), info: color() })),
      chart: maybe(() => [color(), color(), color(), color(), color()]),
      chartStyle: maybe(() => pick(CHART_STYLES)),
    },
    fonts: maybe(() => ({
      sans: pick(["Inter", "Geist", "Space Grotesk"]),
      heading: maybe(() => pick(["Fraunces", "Playfair Display"])),
    })),
    radius: maybe(() => num(0, 2)),
    letterSpacing: maybe(() => num(-0.1, 0.2)),
    spacing: maybe(() => num(0.15, 0.4)),
    shadow: maybe(() => ({
      x: num(-20, 20, 1),
      y: num(-20, 20, 1),
      blur: num(0, 50, 1),
      spread: num(-20, 20, 1),
      opacity: num(0, 1, 2),
      color: maybe(color),
    })),
    border: maybe(() => ({ width: num(0, 4, 2) })),
    states: maybe(() => ({
      hoverShift: num(0, 0.2),
      focusRing: pick(RING_SOURCES),
    })),
    components: maybe(() => ({
      surfaceStyle: pick(SURFACE_STYLES),
      density: pick(DENSITIES),
      buttonShape: pick(BUTTON_SHAPES),
      buttonStyle: pick(BUTTON_STYLES),
      inputStyle: pick(INPUT_STYLES),
      focusRing: pick(FOCUS_RINGS),
      tabStyle: pick(TAB_STYLES),
    })),
    overrides: maybe(() => ({ light: overrides(), dark: overrides() })),
  });
}

/** Every optional field set, and every token pinned in both modes. */
const EVERYTHING = ThemeSchemaV1.parse({
  v: 1,
  name: "Everything",
  colors: {
    brand: "#e11d48",
    neutral: { hue: 257, chroma: 0.02 },
    secondary: "#0ea5e9",
    semantic: {
      danger: "#dc2626",
      success: "#16a34a",
      warning: "#f59e0b",
      info: "#0284c7",
    },
    chart: ["#e11d48", "#0ea5e9", "#16a34a", "#f59e0b", "#7c3aed"],
    chartStyle: "monochrome",
  },
  fonts: { sans: "Geist", mono: "Geist Mono", heading: "Fraunces" },
  radius: 1,
  letterSpacing: -0.02,
  spacing: 0.3,
  shadow: { x: 1, y: 4, blur: 12, spread: -2, opacity: 0.2, color: "#1e1b4b" },
  border: { width: 2 },
  states: { hoverShift: 0.08, focusRing: "brand" },
  components: {
    surfaceStyle: "both",
    density: "compact",
    buttonShape: "pill",
    buttonStyle: "outline",
    inputStyle: "underline",
    focusRing: "glow",
    tabStyle: "pill",
  },
  overrides: {
    light: Object.fromEntries(
      COLOR_TOKENS.map((token, i) => [token, [0.3 + i * 0.02, 0.1, i * 11]]),
    ),
    dark: Object.fromEntries(
      COLOR_TOKENS.map((token, i) => [
        token,
        [0.9 - i * 0.02, 0.12, i * 7, 0.5],
      ]),
    ),
  },
});

describe("share-link keys", () => {
  it("are unique", () => {
    const keys = Object.values(FIELD_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("exist for every field a theme can hold", () => {
    for (const path of Object.keys(flatten(EVERYTHING))) {
      expect([path, keyForPath(path)]).not.toEqual([path, null]);
      expect(pathForKey(keyForPath(path) ?? "")).toBe(path);
    }
  });

  it("don't read look-alike override keys", () => {
    expect(pathForKey("L0")).toBe("overrides.light.background");
    expect(pathForKey("L00")).toBeNull();
    expect(pathForKey("Lzz")).toBeNull();
    expect(pathForKey("X1")).toBeNull();
  });
});

describe("encodeTheme / decodeTheme", () => {
  it("round-trips the default theme in a tiny link", () => {
    const encoded = encodeTheme(DEFAULT_THEME);
    expect(decodeTheme(encoded)).toEqual(DEFAULT_THEME);
    expect(encoded.length).toBeLessThan(20);
  });

  it("round-trips a theme using every field", () => {
    expect(decodeTheme(encodeTheme(EVERYTHING))).toEqual(EVERYTHING);
  });

  it("round-trips hundreds of random themes", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const theme = randomTheme(seed);
      const encoded = encodeTheme(theme);
      expect([seed, decodeTheme(encoded)]).toEqual([seed, theme]);
      // Encoding is stable: the same theme always gives the same link.
      expect(encodeTheme(decodeTheme(encoded) ?? DEFAULT_THEME)).toBe(encoded);
    }
  });

  it("keeps links short", () => {
    const typical = ThemeSchemaV1.parse({
      v: 1,
      colors: { brand: "#7c3aed", neutral: { hue: 280, chroma: 0.01 } },
      fonts: { sans: "Geist" },
      radius: 0.75,
      components: { buttonShape: "pill", surfaceStyle: "shadow" },
    });
    expect(encodeTheme(typical).length).toBeLessThan(150);
    // Even every token pinned in both modes stays under 2,000 characters.
    expect(encodeTheme(EVERYTHING).length).toBeLessThan(2000);
  });

  it("returns null for anything that isn't a theme link", () => {
    for (const junk of [
      "",
      null,
      undefined,
      "1",
      "1garbage!!",
      "2N4IgLgFg", // unknown codec
      `1${"A".repeat(MAX_ENCODED_LENGTH)}`,
    ]) {
      expect(decodeTheme(junk)).toBeNull();
    }
  });

  it("ignores keys it doesn't know and enum indexes out of range", () => {
    const link = `1${compressToEncodedURIComponent(
      JSON.stringify({ v: 1, zz: 5, kd: 9, r: 1 }),
    )}`;
    const theme = decodeTheme(link);
    expect(theme?.radius).toBe(1);
    expect(theme?.components.density).toBe("default");
  });
});

// Real links from v1. They must decode to these themes forever. If one fails,
// fix the decoder or add a migration; never edit a fixture.
const GOLDEN_V1: { link: string; input: object }[] = [
  { link: "1N4IgbiBcCMC+Q", input: { v: 1 } },
  {
    link: "1N4IgbiBcCMA0ICMoG0AMA6ArAFmgZlgwCZsA2U2IgTj3VWgF14AnKDAdkwF8g",
    input: { v: 1, colors: { brand: "#7c3aed" }, radius: 0.75 },
  },
  {
    link: "1N4IgbiBcCMA0IDsogCIFcDOBrE8BGUA2gAwB0ArABxWxkBMDs0A7BZQLrwIAWUdlxLgGMoZYtDrwMRMgDZKAFma1S0JQE5YdAMyttdTiCHSY8AGYmQAcQCmASwwAXXCDO9IIAGIAnAIZoEIRtpeG4ATygFUIIYSRBuAHtRVUp4RzMoOBAsEyysABM+eCwYuKwI02y7TOKMyDLnSoAZGJIKBXlaWkMUd0I4QUHSbW11dgBfIA",
    input: {
      v: 1,
      name: "Dusk",
      colors: {
        brand: "#e11d48",
        neutral: { hue: 280, chroma: 0.012 },
        secondary: "#0ea5e9",
        chartStyle: "monochrome",
      },
      fonts: { sans: "Geist", heading: "Fraunces" },
      shadow: { y: 4, blur: 12, opacity: 0.18 },
      states: { focusRing: "brand" },
      components: {
        surfaceStyle: "shadow",
        density: "comfortable",
        buttonShape: "pill",
        buttonStyle: "soft",
        inputStyle: "filled",
        focusRing: "glow",
        tabStyle: "pill",
      },
      overrides: {
        light: { "muted-foreground": [0.5468, 0, 0] },
        dark: { input: [1, 0, 0, 0.339] },
      },
    },
  },
];

describe("golden v1 links", () => {
  it.each(GOLDEN_V1)("decodes $link", ({ link, input }) => {
    expect(decodeTheme(link)).toEqual(ThemeSchemaV1.parse(input));
  });

  it.each(GOLDEN_V1)("encodes to exactly $link", ({ link, input }) => {
    expect(encodeTheme(ThemeSchemaV1.parse(input))).toBe(link);
  });

  it("survives a query string turning + into a space", () => {
    for (const { link, input } of GOLDEN_V1) {
      const mangled = new URLSearchParams(`t=${link}`).get("t");
      expect(decodeTheme(mangled)).toEqual(ThemeSchemaV1.parse(input));
    }
  });
});
