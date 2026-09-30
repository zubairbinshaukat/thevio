// Token-file exports (DTCG, Figma Variables, Tokens Studio): validated
// against the official DTCG 2025.10 JSON Schemas, checked for each tool's
// import rules, and decoded back to prove every value survives.

import { readFileSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { type Oklch, oklch, parseColor } from "../color/convert";
import { importTheme } from "../import/import";
import { colorDistance } from "../import/infer";
import { DEFAULT_THEME } from "../theme/defaults";
import { MODES, resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import { STYLE_PRESETS } from "../theme/style-presets";
import { COLOR_TOKENS } from "../theme/tokens";
import { toDtcg } from "./dtcg";
import { toFigma } from "./figma";
import type { ExportFile } from "./format";
import { toTokensStudio } from "./tokens-studio";

type Json = Record<string, unknown>;

const schema = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/dtcg-2025.10-${name}.schema.json`, import.meta.url),
      "utf8",
    ),
  );

// The official schemas are draft-07 and use `format`: plain Ajv + formats.
// One instance each: the resolver schema embeds the format schema's $ids.
const compile = (name: string) => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return { ajv, validate: ajv.compile(schema(name)) };
};
const format = compile("format");
const resolverSchema = compile("resolver");
const validateFormat = format.validate;
const validateResolver = resolverSchema.validate;
const ajv = format.ajv;

const THEMES = {
  default: DEFAULT_THEME,
  grove: ThemeSchemaV1.parse({
    v: 1,
    name: "Grove",
    colors: {
      brand: "#0f9d74",
      secondary: "#e9a23b",
      neutral: { hue: 150, chroma: 0.02 },
    },
    fonts: { sans: "Manrope", heading: "Fraunces" },
    shadow: { color: "#1a3d2b", opacity: 0.2 },
    components: STYLE_PRESETS.soft,
  }),
  crisp: ThemeSchemaV1.parse({
    v: 1,
    colors: { brand: "#ffe600" },
    radius: 0,
    components: STYLE_PRESETS.crisp,
  }),
};

const files = (list: ExportFile[]) =>
  Object.fromEntries(list.map((file) => [file.path, file]));
const json = (file: ExportFile | undefined): Json => {
  if (!file) throw new Error("missing file");
  return JSON.parse(file.contents);
};

/** Walk a token tree: [path, token] for every node with `$value`. */
function tokensOf(tree: Json, prefix: string[] = []): [string, Json][] {
  const out: [string, Json][] = [];
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith("$") || typeof value !== "object" || !value) continue;
    const node = value as Json;
    const path = [...prefix, key];
    if ("$value" in node) out.push([path.join("."), node]);
    else out.push(...tokensOf(node, path));
  }
  return out;
}

/** No token path is also a group (a prefix of another token's path). */
function expectNoClash(paths: string[]) {
  const set = new Set(paths);
  expect(set.size, "duplicate token paths").toBe(paths.length);
  for (const path of paths) {
    const parts = path.split(".");
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join(".");
      expect(set.has(prefix), `${prefix} is a token and a group`).toBe(false);
    }
  }
}

const fromDtcgColor = (value: unknown): Oklch => {
  const v = value as { components: number[]; alpha?: number };
  const [l = 0, c = 0, h = 0] = v.components;
  return oklch(l, c, h, v.alpha);
};

describe("toDtcg", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const resolved = resolveTheme(theme);
    const out = files(toDtcg(resolved));
    const base = json(out["tokens/base.tokens.json"]);

    it(`${name}: every file validates against the DTCG 2025.10 schemas`, () => {
      for (const path of [
        "tokens/base.tokens.json",
        "tokens/light.tokens.json",
        "tokens/dark.tokens.json",
      ]) {
        const valid = validateFormat(json(out[path]));
        expect(valid, `${path}: ${ajv.errorsText(validateFormat.errors)}`).toBe(
          true,
        );
      }
      const resolver = json(out["tokens/thevio.resolver.json"]);
      expect(
        validateResolver(resolver),
        resolverSchema.ajv.errorsText(validateResolver.errors),
      ).toBe(true);
    });

    it(`${name}: every mode colour decodes back to the theme's value`, () => {
      const baseTokens = Object.fromEntries(tokensOf(base));
      for (const mode of MODES) {
        const tree = json(out[`tokens/${mode}.tokens.json`]);
        const tokens = Object.fromEntries(tokensOf(tree));
        const value = (path: string): Oklch => {
          const token = tokens[path] ?? baseTokens[path];
          if (!token) throw new Error(`unresolved ${path}`);
          const v = token.$value;
          return typeof v === "string"
            ? value(v.slice(1, -1))
            : fromDtcgColor(v);
        };
        for (const token of COLOR_TOKENS) {
          const got = value(`color.${token}`);
          expect(
            colorDistance(got, resolved.colors[mode][token]),
            `${mode} ${token}`,
          ).toBeLessThan(0.0005);
        }
      }
    });

    it(`${name}: writes greys with hue 0, never "none"`, () => {
      const all = Object.values(out)
        .map((file) => file.contents)
        .join("");
      expect(all).not.toContain('"none"');
    });
  }

  it("references scale steps instead of repeating values", () => {
    const out = files(toDtcg(resolveTheme(DEFAULT_THEME)));
    const light = json(out["tokens/light.tokens.json"]) as {
      color: Record<string, Json>;
    };
    expect(light.color.primary?.$value).toMatch(/^\{palette\.brand\.\d+\}$/);
    expect(light.color.border?.$value).toBe("{palette.neutral.200}");
  });

  it("never uses one path as both a token and a group once files merge", () => {
    for (const theme of Object.values(THEMES)) {
      const out = files(toDtcg(resolveTheme(theme)));
      const base = json(out["tokens/base.tokens.json"]);
      for (const mode of MODES) {
        const paths = [
          ...tokensOf(base),
          ...tokensOf(json(out[`tokens/${mode}.tokens.json`])),
        ].map(([path]) => path);
        expectNoClash(paths);
      }
    }
  });

  it("keeps the component style and the source link", () => {
    const resolved = resolveTheme(THEMES.grove);
    const base = json(files(toDtcg(resolved))["tokens/base.tokens.json"]);
    expect(JSON.stringify(base)).toContain('"preset":"soft"');
    const back = importTheme(JSON.stringify(base));
    expect(back.ok && back.theme).toEqual(THEMES.grove);
  });

  it("matches the golden light file", () => {
    const out = files(toDtcg(resolveTheme(DEFAULT_THEME)));
    expect(out["tokens/light.tokens.json"]?.contents).toMatchSnapshot();
  });
});

describe("toFigma", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const resolved = resolveTheme(theme);
    const out = files(toFigma(resolved));
    const modes = {
      light: json(out["figma/Light.tokens.json"]),
      dark: json(out["figma/Dark.tokens.json"]),
    };

    it(`${name}: both mode files hold the same variables with the same types`, () => {
      const shape = (tree: Json) =>
        tokensOf(tree).map(([path, token]) => `${path}:${token.$type}`);
      expect(shape(modes.light)).toEqual(shape(modes.dark));
      expectNoClash(tokensOf(modes.light).map(([path]) => path));
    });

    it(`${name}: only uses what Figma's import accepts`, () => {
      for (const tree of Object.values(modes)) {
        for (const [path, token] of tokensOf(tree)) {
          const value = token.$value as Json | string;
          switch (token.$type) {
            case "color":
              if (typeof value === "string") {
                const target = value.slice(1, -1);
                expect(
                  tokensOf(tree).some(([p]) => p === target),
                  `${path} → ${target}`,
                ).toBe(true);
              } else {
                expect(value.colorSpace, path).toBe("srgb");
                expect(value.hex, path).toMatch(/^#[0-9a-f]{6}$/);
              }
              break;
            case "dimension":
              expect((value as Json).unit, path).toBe("px");
              break;
            case "fontFamily":
            case "string":
              expect(typeof value, path).toBe("string");
              break;
            default:
              throw new Error(`${path}: unsupported $type ${token.$type}`);
          }
        }
      }
    });

    it(`${name}: colours match the theme's hex values`, () => {
      for (const mode of MODES) {
        const tree = modes[mode];
        const lookup = Object.fromEntries(tokensOf(tree));
        const hex = (path: string): string => {
          const v = lookup[path]?.$value;
          return typeof v === "string"
            ? hex(v.slice(1, -1))
            : ((v as Json).hex as string);
        };
        for (const token of COLOR_TOKENS) {
          const expected = parseColor(hex(`color.${token}`));
          if (!expected) throw new Error(token);
          const color = resolved.colors[mode][token];
          expect(
            colorDistance(expected, oklch(color.l, color.c, color.h)),
            `${mode} ${token}`,
          ).toBeLessThan(0.01);
        }
      }
    });
  }
});

describe("toTokensStudio", () => {
  for (const [name, theme] of Object.entries(THEMES)) {
    const resolved = resolveTheme(theme);
    const [file] = toTokensStudio(resolved);
    const data = json(file) as Json & {
      $themes: { selectedTokenSets: Record<string, string> }[];
      $metadata: { tokenSetOrder: string[] };
    };

    it(`${name}: is a single-file layout with light and dark themes`, () => {
      expect(data.$metadata.tokenSetOrder).toEqual(["global", "light", "dark"]);
      expect(data.$themes.map((t) => t.selectedTokenSets)).toEqual([
        { global: "source", light: "enabled" },
        { global: "source", dark: "enabled" },
      ]);
    });

    it(`${name}: every token carries $value and $type, groups carry none`, () => {
      for (const set of ["global", "light", "dark"]) {
        const walk = (node: Json) => {
          if ("$value" in node) {
            expect(typeof node.$type).toBe("string");
            return;
          }
          expect(node).not.toHaveProperty("$type");
          expect(node).not.toHaveProperty("value");
          for (const child of Object.values(node)) walk(child as Json);
        };
        walk(data[set] as Json);
      }
    });

    it(`${name}: references resolve without set names, and never clash`, () => {
      const global = Object.fromEntries(tokensOf(data.global as Json));
      for (const mode of MODES) {
        expectNoClash([
          ...Object.keys(global),
          ...tokensOf(data[mode] as Json).map(([path]) => path),
        ]);
        for (const [path, token] of tokensOf(data[mode] as Json)) {
          const value = token.$value;
          if (typeof value === "string" && value.startsWith("{")) {
            expect(global[value.slice(1, -1)], `${mode} ${path}`).toBeDefined();
          } else if (token.$type === "color") {
            expect(value, path).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
          }
        }
      }
    });
  }

  it("keeps shadows as boxShadow layers", () => {
    const [file] = toTokensStudio(resolveTheme(DEFAULT_THEME));
    const global = json(file).global as { shadow: Record<string, Json> };
    expect(global.shadow.sm).toEqual({
      $type: "boxShadow",
      $value: [
        {
          x: 0,
          y: 1,
          blur: 3,
          spread: 0,
          color: "#0000001a",
          type: "dropShadow",
        },
        {
          x: 0,
          y: 1,
          blur: 2,
          spread: -1,
          color: "#0000001a",
          type: "dropShadow",
        },
      ],
    });
  });
});
