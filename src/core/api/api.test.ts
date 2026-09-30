import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { registryItemSchema } from "shadcn/schema";
import { describe, expect, it } from "vitest";
import { encodeTheme } from "../codec/encode";
import { toCss } from "../export/css";
import { EXPORT_FORMATS } from "../export/formats";
import { DEFAULT_THEME } from "../theme/defaults";
import { resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import type { ApiResult } from "./http";
import { preflight } from "./http";
import { llmsTxt } from "./llms";
import { openApiDocument } from "./openapi";
import { registryForCode, registryItem, stripJson } from "./registry";
import { getTheme, MAX_BODY_BYTES, postTheme } from "./theme";

const ORIGIN = "https://thevio.test";
const fixture = (name: string) =>
  readFileSync(new URL(`../import/fixtures/${name}`, import.meta.url), "utf8");

const body = (result: ApiResult) => JSON.parse(result.body);
const get = (query: string) => getTheme(new URLSearchParams(query), ORIGIN);
const post = (contentType: string | null, text: string, query = "") =>
  postTheme(contentType, text, new URLSearchParams(query), ORIGIN);

const yellow = ThemeSchemaV1.parse({ v: 1, colors: { brand: "#ffe600" } });
const yellowCode = encodeTheme(yellow);

function expectProblem(result: ApiResult, status: number) {
  expect(result.status).toBe(status);
  expect(result.headers["Content-Type"]).toMatch(/^application\/problem\+json/);
  expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
  const problem = body(result);
  expect(problem).toMatchObject({ type: "about:blank", status });
  expect(problem.detail.length).toBeGreaterThan(10);
}

describe("GET /api/theme", () => {
  it("returns the fixed theme, its links and every fix", () => {
    const result = get(`t=${yellowCode}`);
    expect(result.status).toBe(200);
    expect(result.headers["CDN-Cache-Control"]).toBe("max-age=31536000");
    expect(result.headers["Access-Control-Allow-Origin"]).toBe("*");
    const data = body(result);
    // Yellow on white fails 3:1, so the fixer moves things and says so.
    expect(
      data.fixes.some((f: { kind: string }) => f.kind === "contrast"),
    ).toBe(true);
    expect(data.t).not.toBe(yellowCode);
    expect(data.url).toBe(`${ORIGIN}/studio?t=${data.t}`);
    expect(data.install).toBe(
      `npx shadcn@latest add ${ORIGIN}/r/t/${data.t}.json`,
    );
    expect(Object.keys(data.exports)).toEqual(EXPORT_FORMATS.map((f) => f.id));
  });

  it("can skip contrast fixing", () => {
    const data = body(get(`t=${yellowCode}&fix=false`));
    expect(data.fixes).toEqual([]);
    expect(data.t).toBe(yellowCode);
  });

  it("returns an export directly with ?format=", () => {
    const css = get(`t=${yellowCode}&format=css`);
    expect(css.status).toBe(200);
    expect(css.headers["Content-Type"]).toBe("text/css; charset=utf-8");
    expect(css.body).toContain(":root {");
    const md = get(`t=${yellowCode}&format=design-md`);
    expect(md.headers["Content-Type"]).toMatch(/^text\/markdown/);
    const dtcg = body(get(`t=${yellowCode}&format=dtcg`));
    expect(dtcg.files.map((f: { path: string }) => f.path)).toContain(
      "tokens/thevio.resolver.json",
    );
  });

  it("explains bad requests", () => {
    expectProblem(get(""), 400);
    expectProblem(get("t=nope"), 422);
    expectProblem(get("t=1%%%"), 422);
    const unknown = get(`t=${yellowCode}&format=pdf`);
    expectProblem(unknown, 400);
    expect(body(unknown).formats).toContain("css");
  });
});

describe("POST /api/theme", () => {
  it("accepts a partial Thevio theme, loosely typed", () => {
    const result = post(
      "application/json",
      JSON.stringify({ colors: { brand: "hsl(160 84% 34%)" }, radius: 9 }),
    );
    expect(result.status).toBe(200);
    expect(result.headers["Cache-Control"]).toBe("no-store");
    const data = body(result);
    expect(data.theme.radius).toBe(2);
    expect(data.fixes).toContainEqual(
      expect.objectContaining({ path: "radius", action: "clamped" }),
    );
    expect(data.import.format).toBe("thevio-json");
  });

  it("imports a pasted globals.css, as text/css or wrapped in JSON", () => {
    const css = fixture("shadcn-v3-blue.css");
    const direct = body(post("text/css", css));
    const wrapped = body(post("application/json", JSON.stringify({ css })));
    expect(direct.import.format).toBe("css");
    expect(direct.theme).toEqual(wrapped.theme);
    expect(direct.theme.radius).toBe(0.5);
  });

  it("imports tweakcn registry JSON and names the source", () => {
    const data = body(
      post("application/json", fixture("tweakcn-claude.registry.json")),
    );
    expect(data.import.format).toBe("shadcn-registry");
    expect(data.theme.name).toBe("Claude");
    expect(data.unfixable).toEqual([]);
  });

  it("restores a Thevio export exactly", () => {
    const theme = ThemeSchemaV1.parse({
      v: 1,
      name: "Round trip",
      colors: { brand: "#0f9d74" },
      components: { buttonShape: "pill" },
    });
    const data = body(post("text/css", toCss(resolveTheme(theme))));
    expect(data.import.format).toBe("thevio-link");
    expect(data.theme.components.buttonShape).toBe("pill");
  });

  it("refuses what it can't use, with the right status", () => {
    expectProblem(post("application/json", "{ nope"), 400);
    expectProblem(post("multipart/form-data; boundary=x", "--x"), 415);
    expectProblem(post("text/css", ".card { color: red }"), 422);
    expectProblem(post("text/css", "x".repeat(MAX_BODY_BYTES + 1)), 413);
    expectProblem(post("application/json", JSON.stringify({ v: 99 })), 422);
  });

  it("answers CORS preflight", () => {
    const result = preflight();
    expect(result.status).toBe(204);
    expect(result.headers["Access-Control-Allow-Methods"]).toContain("POST");
  });
});

describe("/r registry items", () => {
  it("serves a share code as an installable item, exactly as shared", () => {
    const result = registryForCode(`${yellowCode}.json`);
    expect(result.status).toBe(200);
    const item = body(result);
    expect(registryItemSchema.safeParse(item).success).toBe(true);
    // No contrast fixes behind the user's back: the pinned brand stays.
    expect(item.cssVars.light.primary).toBe(
      toCss(resolveTheme(yellow)).match(/--primary: ([^;]+);/)?.[1],
    );
  });

  it("names sample items after their URL", () => {
    expect(body(registryItem(DEFAULT_THEME, "default")).name).toBe("default");
  });

  it("404s a code that doesn't decode", () => {
    expectProblem(registryForCode("garbage.json"), 404);
    expect(stripJson("1abc.json")).toBe("1abc");
  });
});

describe("/openapi.json", () => {
  const doc = openApiDocument(ORIGIN, ["default", "grove"]);
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  // Register the components so $refs resolve, as an OpenAPI tool would.
  ajv.addSchema({ $id: "doc", components: doc.components }, "doc");
  const schema = (name: string) =>
    ajv.compile({ $ref: `doc#/components/schemas/${name}` });

  it("describes a real response and a real request body", () => {
    const validateResponse = schema("ThemeResponse");
    const response = body(get(`t=${yellowCode}`));
    // Registry $refs point at shadcn's hosted schema; skip the network here.
    expect(
      validateResponse(response),
      ajv.errorsText(validateResponse.errors),
    ).toBe(true);
    const validateInput = schema("ThemeInput");
    expect(validateInput({ colors: { brand: "#0f9d74" }, radius: 0.5 })).toBe(
      true,
    );
    expect(validateInput({ colors: { brand: "#0f9d74" }, surprise: 1 })).toBe(
      false,
    );
  });

  it("lists every export format and endpoint", () => {
    const params = doc.paths["/api/theme"].get.parameters;
    const format = params.find((p) => p.name === "format");
    expect(format?.schema).toMatchObject({
      enum: EXPORT_FORMATS.map((f) => f.id),
    });
    expect(Object.keys(doc.paths)).toEqual([
      "/api/theme",
      "/r/t/{code}.json",
      "/r/{name}.json",
      "/api/og",
    ]);
  });
});

describe("/llms.txt", () => {
  it("follows llmstxt.org and names the real URLs", () => {
    const text = llmsTxt(ORIGIN, ["default", "grove"]);
    expect(text).toMatch(/^# Thevio\n\n> /);
    expect(text).toContain(`${ORIGIN}/openapi.json`);
    expect(text).toContain(`${ORIGIN}/r/grove.json`);
    for (const format of EXPORT_FORMATS)
      expect(text).toContain(`\`${format.id}\``);
  });
});
