import { registryItemSchema } from "shadcn/schema";
import { describe, expect, it } from "vitest";
import { importTheme } from "../import/import";
import { DEFAULT_THEME } from "../theme/defaults";
import { resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import { COLOR_TOKENS } from "../theme/tokens";
import { toRegistryItem, toShadcnRegistry } from "./shadcn-registry";

const grove = ThemeSchemaV1.parse({
  v: 1,
  name: "Grove Dark!",
  colors: { brand: "#0f9d74" },
  fonts: { sans: "Manrope" },
  letterSpacing: -0.01,
  components: { buttonShape: "pill" },
});

describe("toRegistryItem", () => {
  const item = toRegistryItem(resolveTheme(grove));

  it("passes the shadcn CLI's own registry-item schema", () => {
    const result = registryItemSchema.safeParse(item);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    const plain = registryItemSchema.safeParse(
      toRegistryItem(resolveTheme(DEFAULT_THEME)),
    );
    expect(plain.success).toBe(true);
  });

  it("is a theme item with a slug name", () => {
    expect(item.type).toBe("registry:theme");
    expect(item.name).toBe("grove-dark");
    expect(item.title).toBe("Grove Dark!");
  });

  it("carries every colour in both modes, as values the CLI maps to utilities", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const token of COLOR_TOKENS) {
        // update-css-vars.ts only adds --color-X for oklch/hex/hsl/rgb values.
        expect(item.cssVars[mode][token], `${mode} ${token}`).toMatch(
          /^oklch\(/,
        );
      }
      expect(item.cssVars[mode]["tv-soft-bg"]).toMatch(/^oklch\(/);
    }
    expect(item.cssVars.light.radius).toBe("0.625rem");
    expect(item.cssVars.dark.radius).toBe("0.625rem");
  });

  it("puts fonts and shadows into @theme, and only non-default scalars", () => {
    expect(item.cssVars.theme["font-sans"]).toMatch(/^"Manrope", /);
    expect(item.cssVars.theme["shadow-sm"]).toContain("oklch(");
    expect(item.cssVars.theme["tracking-normal"]).toBe("-0.01em");
    expect(item.cssVars.theme).not.toHaveProperty("spacing");
  });

  it("says it installs tokens only, and how to load the fonts", () => {
    expect(item.description).toContain("Component styles are not included");
    expect(item.docs).toContain("Manrope");
  });

  it("imports back into Thevio exactly", () => {
    const back = importTheme(JSON.stringify(item));
    expect(back.ok && back.theme).toEqual(grove);
  });

  it("writes one file under registry/", () => {
    expect(toShadcnRegistry(resolveTheme(grove)).map((f) => f.path)).toEqual([
      "registry/grove-dark.json",
    ]);
  });
});
