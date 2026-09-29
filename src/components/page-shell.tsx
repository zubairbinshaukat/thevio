import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type PageShellProps = {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
};

/** A simple page in the site chrome: header, one soft card, footer. */
export function PageShell({ eyebrow, title, children }: PageShellProps) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center py-16 md:py-24">
        <div className="page">
          <div className="surface relative mx-auto max-w-xl overflow-hidden rounded-2xl px-6 py-12 text-center shadow-xl md:px-12 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,color-mix(in_oklch,var(--brand)_12%,transparent),transparent)]"
            />
            <div className="relative">
              <Logo decorative className="mx-auto h-8 w-auto text-brand" />
              <p className="mt-6 text-eyebrow text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-title">{title}</h1>
              <div className="mt-4 text-lead text-muted-foreground">
                {children}
              </div>
              <a
                href="/"
                className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-md transition-[opacity,scale] duration-200 ease-soft hover:opacity-92 active:scale-[0.97]"
              >
                Back to the engine
              </a>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
