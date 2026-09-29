export type SiteConfig = {
  readonly name: string;
  readonly url: string;
  readonly description: string;
  readonly links: {
    readonly github?: string;
  };
};

const FALLBACK_URL = "http://localhost:3000";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return FALLBACK_URL;
}

export const siteConfig: SiteConfig = {
  name: "Thevio",
  url: resolveSiteUrl(),
  description:
    "A visual theme builder for modern web apps. Build one theme, preview it everywhere, share it by URL, export it anywhere.",
  links: {},
};
