import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

/** A surface: border, shadow, both or flat, from `data-surface`. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cx("tv-surface p-(--tv-card-pad)", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx("mb-(--tv-gap) flex flex-col gap-1", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cx("font-semibold text-base leading-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cx("text-muted-foreground text-sm", className)} {...props} />
  );
}
