"use client";

import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

const VARIANTS = {
  /** Solid, soft or outline, from the scope's `data-button-style`. */
  primary: "tv-btn-primary",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]",
  ghost: "border-transparent bg-transparent hover:bg-muted",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive),var(--foreground)_10%)]",
} as const;

const SIZES = {
  md: "h-(--tv-control-h) px-(--tv-pad-x)",
  sm: "h-[calc(var(--tv-control-h)-0.375rem)] px-[calc(var(--tv-pad-x)*0.75)] text-[0.8125rem]",
  icon: "size-(--tv-control-h) px-0",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-variant={variant}
      className={cx(
        "tv-focus text-(length:--tv-text) inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-(--tv-btn-radius) border font-medium transition-[background-color,color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
