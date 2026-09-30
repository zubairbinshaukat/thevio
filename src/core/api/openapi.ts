// The OpenAPI 3.1 description of Thevio's API, built from the same Zod
// schema that validates requests, so the docs can't drift from the code.
// Served at /openapi.json.

import * as z from "zod";
import { EXPORT_FORMATS } from "../export/formats";
import { StrictThemeSchemaV1 } from "../theme/schema";
import { MAX_BODY_BYTES } from "./theme";

function themeInputSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(StrictThemeSchemaV1, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  // `v` may be left out: the API treats unversioned input as current.
  return { ...schema, required: [] };
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const problemResponse = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: ref("Problem") } },
});

const code = {
  name: "t",
  in: "query",
  required: true,
  description: "A share code: the `t` of a Thevio link (`/studio?t=…`).",
  schema: { type: "string", pattern: "^[0-9][A-Za-z0-9+$-]*$" },
  example: "1N4IgbiBcCMC+Q",
};

const fix = {
  name: "fix",
  in: "query",
  required: false,
  description: "Fix failing WCAG 2 contrast pairs (default true).",
  schema: { type: "boolean", default: true },
};

export function openApiDocument(origin: string, themeNames: readonly string[]) {
  const formatIds = EXPORT_FORMATS.map((format) => format.id);
  return {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "Thevio API",
      version: "1",
      summary: "Build, validate and export shadcn/ui themes over HTTP.",
      description:
        "Send any theme (a Thevio theme, tweakcn or shadcn registry JSON, or a pasted globals.css) and get back a valid theme with WCAG 2 contrast fixed, a share link, a shadcn install command, and every export format. No key needed.",
    },
    servers: [{ url: origin }],
    paths: {
      "/api/theme": {
        get: {
          operationId: "getTheme",
          summary: "Read a shared theme, fix its contrast, or export it",
          parameters: [
            code,
            {
              name: "format",
              in: "query",
              required: false,
              description:
                "Return this export instead of JSON. Single-file formats return the file; multi-file formats return { format, files }.",
              schema: { type: "string", enum: formatIds },
            },
            fix,
          ],
          responses: {
            "200": {
              description: "The theme, or the requested export.",
              content: {
                "application/json": { schema: ref("ThemeResponse") },
                "text/css": { schema: { type: "string" } },
                "text/markdown": { schema: { type: "string" } },
              },
            },
            "400": problemResponse("No `t`, or an unknown `format`."),
            "422": problemResponse("`t` doesn't decode."),
          },
        },
        post: {
          operationId: "importTheme",
          summary: "Validate, import and fix any theme",
          description: `Accepts a Thevio theme (partial is fine), tweakcn JSON, a shadcn registry item, { css } or { source } wrapping text, or text/css. Up to ${MAX_BODY_BYTES / 1024} KB.`,
          parameters: [fix],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    ref("ThemeInput"),
                    {
                      type: "object",
                      properties: { css: { type: "string" } },
                      required: ["css"],
                    },
                    {
                      type: "object",
                      description: "tweakcn or shadcn registry theme JSON.",
                    },
                  ],
                },
                examples: {
                  brand: { value: { colors: { brand: "#0f9d74" } } },
                  css: { value: { css: ":root { --primary: #7c3aed; }" } },
                },
              },
              "text/css": {
                schema: { type: "string" },
                example: ":root { --primary: oklch(0.55 0.2 290); }",
              },
            },
          },
          responses: {
            "200": {
              description: "The fixed theme, and what the import did.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      ref("ThemeResponse"),
                      {
                        type: "object",
                        properties: { import: ref("ImportReport") },
                        required: ["import"],
                      },
                    ],
                  },
                },
              },
            },
            "400": problemResponse("The JSON body doesn't parse."),
            "413": problemResponse("The body is over the size limit."),
            "415": problemResponse("Not JSON or CSS."),
            "422": problemResponse("Nothing in the body reads as a theme."),
          },
        },
      },
      "/r/t/{code}.json": {
        get: {
          operationId: "registryItemForCode",
          summary: "A shadcn registry item for a shared theme",
          description:
            "Install with `npx shadcn@latest add <this URL>`. Tokens only: colours, radius, fonts, shadows.",
          parameters: [{ ...code, in: "path", name: "code" }],
          responses: {
            "200": {
              description: "A `registry:theme` item.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "https://ui.shadcn.com/schema/registry-item.json",
                  },
                },
              },
            },
            "404": problemResponse("The code doesn't decode."),
          },
        },
      },
      "/r/{name}.json": {
        get: {
          operationId: "registryItemByName",
          summary: "A shadcn registry item for one of Thevio's sample themes",
          parameters: [
            {
              name: "name",
              in: "path",
              required: true,
              schema: { type: "string", enum: [...themeNames] },
            },
          ],
          responses: {
            "200": {
              description: "A `registry:theme` item.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "https://ui.shadcn.com/schema/registry-item.json",
                  },
                },
              },
            },
            "404": problemResponse("No sample theme has that name."),
          },
        },
      },
      "/api/og": {
        get: {
          operationId: "ogImage",
          summary: "A 1200×630 preview image of a theme",
          parameters: [{ ...code, required: false }],
          responses: {
            "200": {
              description: "PNG",
              content: { "image/png": {} },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ThemeInput: themeInputSchema(),
        ThemeResponse: {
          type: "object",
          required: ["theme", "t", "url", "registryUrl", "install", "fixes"],
          properties: {
            theme: {
              ...ref("ThemeInput"),
              description: "The full theme, every default filled in.",
            },
            t: { type: "string", description: "The theme's share code." },
            url: { type: "string", format: "uri" },
            registryUrl: { type: "string", format: "uri" },
            install: {
              type: "string",
              description: "The shadcn CLI command that installs it.",
            },
            og: { type: "string", format: "uri" },
            exports: {
              type: "object",
              description: "A URL for each export format.",
              additionalProperties: { type: "string", format: "uri" },
            },
            fixes: { type: "array", items: ref("Fix") },
            unfixable: { type: "array", items: { type: "object" } },
          },
        },
        Fix: {
          type: "object",
          required: ["kind"],
          properties: {
            kind: { enum: ["schema", "contrast"] },
            path: { type: "string" },
            action: { enum: ["dropped", "clamped", "trimmed", "defaulted"] },
            mode: { enum: ["light", "dark"] },
            token: { type: "string" },
            from: {},
            to: {},
            before: { type: "number" },
            after: { type: "number" },
            message: { type: "string" },
          },
        },
        ImportReport: {
          type: "object",
          required: ["format", "pinned", "notes"],
          properties: {
            format: {
              enum: [
                "thevio-link",
                "thevio-json",
                "css",
                "tweakcn",
                "shadcn-registry",
              ],
            },
            pinned: {
              type: "integer",
              description: "Source colours kept exactly as overrides.",
            },
            notes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  level: { enum: ["info", "warning"] },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Problem: {
          type: "object",
          description: "RFC 9457 problem details.",
          required: ["type", "title", "status"],
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            status: { type: "integer" },
            detail: { type: "string" },
          },
        },
      },
    },
  };
}
