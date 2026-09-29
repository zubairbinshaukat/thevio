"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cx("font-medium text-sm leading-none", className)}
      {...props}
    />
  );
}

/** Outline, filled or underline, from `data-input`. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("tv-field tv-focus", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx("tv-field tv-focus", className)} {...props} />;
}
