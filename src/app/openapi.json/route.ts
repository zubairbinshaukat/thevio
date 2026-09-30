import { THEME_IDS } from "@/config/sample-themes";
import { siteConfig } from "@/config/site";
import { CORS } from "@/core/api/http";
import { openApiDocument } from "@/core/api/openapi";

// Built from the Zod schema at build time: static, and never out of date.
export function GET(): Response {
  return Response.json(openApiDocument(siteConfig.url, THEME_IDS), {
    headers: CORS,
  });
}
