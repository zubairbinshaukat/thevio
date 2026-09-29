import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

const VARIANTS = {
  primary: "tv-btn-primary",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  success: "border-transparent bg-success/15 text-foreground",
  warning: "border-transparent bg-warning/22 text-foreground",
  destructive: "border-transparent bg-destructive/12 text-foreground",
} as const;

const DOTS: Partial<Record<keyof typeof VARIANTS, string>> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function Badge({
  variant = "secondary",
  className,
  children,
  ...props
}: ComponentProps<"span"> & { variant?: keyof typeof VARIANTS }) {
  const dot = DOTS[variant];
  return (
    <span
      className={cx(
        "inline-flex h-5.5 items-center gap-1.5 whitespace-nowrap rounded-(--tv-btn-radius) border px-2 font-medium text-xs",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className={cx("size-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}
