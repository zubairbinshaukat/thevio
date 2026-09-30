import { THEME_IDS } from "@/config/sample-themes";
import { siteConfig } from "@/config/site";
import { llmsTxt } from "@/core/api/llms";

export function GET(): Response {
  return new Response(llmsTxt(siteConfig.url, THEME_IDS), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
