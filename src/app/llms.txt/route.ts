import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

export function GET(): Response {
  const body = `# ${siteConfig.name}\n\n> ${siteConfig.description}\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
