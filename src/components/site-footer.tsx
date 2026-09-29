import { Logo } from "@/components/logo";
import { siteConfig } from "@/config/site";

const AUTHOR_URL = "https://zubyr.dev";
const REPO_URL = "https://github.com/zubairbinshaukat/thevio";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/#export", label: "Exports" },
      { href: "/llms.txt", label: "llms.txt" },
    ],
  },
  {
    title: "Source",
    links: [
      { href: REPO_URL, label: "GitHub" },
      { href: AUTHOR_URL, label: "zubyr.dev" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="pt-12 pb-28 md:pb-32">
      <div className="page">
        <div className="flex flex-col gap-10 border-edge border-t pt-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <a
              href="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight"
            >
              <Logo decorative className="h-4.5 w-auto" />
              {siteConfig.name}
            </a>
            <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
              Build one theme, preview it everywhere, share it by URL, export it
              anywhere.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-eyebrow text-muted-foreground">
                  {column.title}
                </p>
                <ul className="mt-3 grid gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        {...(link.href.startsWith("http") && {
                          target: "_blank",
                          rel: "noopener",
                        })}
                        className="text-sm transition-colors hover:text-muted-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 flex items-center gap-2 text-muted-foreground text-xs">
          <span aria-hidden className="size-1.5 rounded-full bg-brand" />
          Built in Lahore by{" "}
          <a
            href={AUTHOR_URL}
            rel="me noopener"
            target="_blank"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Zubair Bin Shaukat
          </a>
        </p>
      </div>
    </footer>
  );
}
