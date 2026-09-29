import { Logo } from "@/components/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { siteConfig } from "@/config/site";

const NAV = [
  { href: "/#build", label: "Build" },
  { href: "/#validate", label: "Validate" },
  { href: "/#share", label: "Share" },
  { href: "/#export", label: "Export" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-edge/0 border-b bg-background/72 backdrop-blur-xl backdrop-saturate-150 supports-backdrop-filter:bg-background/60">
      <div className="page flex h-16 items-center gap-6">
        <a
          href="/"
          className="-ml-1 flex items-center gap-2.5 rounded-md px-1 font-semibold tracking-tight"
        >
          <Logo decorative className="h-4.5 w-auto" />
          {siteConfig.name}
        </a>
        <nav aria-label="Sections" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-muted-foreground text-sm transition-colors duration-200 hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <a
            href="/studio"
            className="inline-flex h-9 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground text-sm shadow-sm transition-[opacity,scale] duration-200 ease-soft hover:opacity-90 active:scale-95"
          >
            Open Studio
          </a>
        </div>
      </div>
    </header>
  );
}
