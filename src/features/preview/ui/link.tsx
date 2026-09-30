import type { ComponentProps, MouseEvent } from "react";
import { cx } from "@/lib/cx";

// Preview links look and read like real links, but following one would
// navigate the Studio away, so the click is cancelled.
const stay = (event: MouseEvent) => event.preventDefault();

/**
 * A path on the fictional site. Ctrl- or middle-click opens it on a reserved
 * `.example` domain, never on a Thevio URL.
 */
type LinkProps = Omit<ComponentProps<"a">, "href"> & { href: `/${string}` };

const site = (path: string) => `https://acme.example${path}`;

/** An inline link in the theme's primary text colour (≥ 4.5:1). */
export function TextLink({ href, className, ...props }: LinkProps) {
  return (
    <a
      href={site(href)}
      onClick={stay}
      className={cx(
        "tv-focus rounded-[2px] font-medium text-primary-text underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    />
  );
}

/** A quiet nav link, e.g. in a page header. */
export function NavLink({ href, className, ...props }: LinkProps) {
  return (
    <a
      href={site(href)}
      onClick={stay}
      className={cx(
        "tv-focus rounded-[min(var(--tv-btn-radius),calc(var(--radius)*0.8))] px-2 py-1 text-muted-foreground text-sm transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
