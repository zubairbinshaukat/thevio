import { describe, expect, it } from "vitest";
import * as z from "zod";
import { DEFAULT_THEME, parseTheme } from "./defaults";
import { migrate } from "./migrate";
import {
  normalizeColor,
  StrictThemeSchemaV1,
  THEME_VERSION,
  ThemeSchemaV1,
} from "./schema";

describe("ThemeSchemaV1", () => {
  it("fills every default from just a version", () => {
    expect(DEFAULT_THEME.colors.brand).toEqual([0.5461, 0.2152, 262.88]);
    expect(DEFAULT_THEME.colors.neutral).toEqual({ hue: 0, chroma: 0 });
    expect(DEFAULT_THEME.radius).toBe(0.625);
    expect(DEFAULT_THEME.fonts).toEqual({
      sans: "Inter",
      mono: "JetBrains Mono",
    });
    expect(DEFAULT_THEME.components.buttonShape).toBe("rounded");
    expect(DEFAULT_THEME.overrides).toEqual({});
  });

  it("turns any CSS colour into a rounded OKLCH tuple", () => {
    const theme = ThemeSchemaV1.parse({
      v: 1,
      colors: { brand: "rgb(37 99 235)", secondary: "oklch(0.7 0.1 30)" },
    });
    expect(theme.colors.brand).toEqual(DEFAULT_THEME.colors.brand);
    expect(theme.colors.secondary).toEqual([0.7, 0.1, 30]);
  });

  it("is idempotent: parsing a parsed theme changes nothing", () => {
    expect(ThemeSchemaV1.parse(DEFAULT_THEME)).toEqual(DEFAULT_THEME);
  });

  it("rejects colours it can't read and values out of range", () => {
    expect(
      ThemeSchemaV1.safeParse({ v: 1, colors: { brand: "nope" } }).success,
    ).toBe(false);
    expect(ThemeSchemaV1.safeParse({ v: 1, radius: 5 }).success).toBe(false);
  });

  it("drops unknown keys, unless strict", () => {
    const loose = ThemeSchemaV1.parse({ v: 1, surprise: true });
    expect("surprise" in loose).toBe(false);
    expect(
      StrictThemeSchemaV1.safeParse({ v: 1, surprise: true }).success,
    ).toBe(false);
  });

  it("accepts overrides only for real tokens", () => {
    const ok = ThemeSchemaV1.safeParse({
      v: 1,
      overrides: { dark: { border: "oklch(1 0 0 / 10%)" } },
    });
    expect(ok.success && ok.data.overrides.dark?.border).toEqual([
      1, 0, 0, 0.1,
    ]);
    expect(
      StrictThemeSchemaV1.safeParse({
        v: 1,
        overrides: { light: { primray: "#000" } },
      }).success,
    ).toBe(false);
  });

  it("publishes a JSON Schema for the API and LLM tools", () => {
    const schema = z.toJSONSchema(StrictThemeSchemaV1, { io: "input" });
    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("colors");
  });
});

describe("normalizeColor", () => {
  it("clamps, rounds, zeroes grey hues and drops opaque alpha", () => {
    expect(normalizeColor(1.2, -0.1, 400)).toEqual([1, 0, 0]);
    expect(normalizeColor(0.123456, 0.2, -10)).toEqual([0.1235, 0.2, 350]);
    expect(normalizeColor(0.5, 0.1, 30, 1)).toEqual([0.5, 0.1, 30]);
    expect(normalizeColor(0.5, 0.1, 30, 0.25)).toEqual([0.5, 0.1, 30, 0.25]);
    expect(normalizeColor(0.5, 0.1, 359.999)).toEqual([0.5, 0.1, 0]);
  });
});

describe("migrate", () => {
  it("treats input without a version as current", () => {
    expect(migrate({ radius: 1 })).toEqual({ radius: 1, v: THEME_VERSION });
    expect(parseTheme({ radius: 1 }).success).toBe(true);
  });

  it("leaves non-objects and future versions for the schema to reject", () => {
    expect(migrate("x")).toBe("x");
    expect(migrate(null)).toBeNull();
    expect(parseTheme({ v: THEME_VERSION + 1 }).success).toBe(false);
  });
});
