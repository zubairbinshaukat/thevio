"use client";

import {
  Avatar as AvatarPrimitive,
  Progress as ProgressPrimitive,
  Separator as SeparatorPrimitive,
} from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cx(
        "inline-grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-soft font-semibold text-soft-foreground text-xs",
        className,
      )}
    >
      <AvatarPrimitive.Fallback>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Progress({
  value,
  className,
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root> & { value: number }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      className={cx(
        "relative h-2 overflow-hidden rounded-[min(var(--tv-btn-radius),9999px)] bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-primary transition-transform duration-500"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Separator({
  className,
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      className={cx(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      className={cx("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cx(
        "h-(--tv-row-h) border-border border-b text-left font-medium text-muted-foreground text-xs",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cx("h-(--tv-row-h) border-border border-b", className)}
      {...props}
    />
  );
}
