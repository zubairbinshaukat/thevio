"use client";

import {
  Checkbox as CheckboxPrimitive,
  RadioGroup as RadioPrimitive,
  Switch as SwitchPrimitive,
} from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { CheckIcon } from "./icons";

// Unchecked boundaries use --tv-line, which reaches 3:1 on page, card and
// field (WCAG 1.4.11); checked states fill with primary.

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cx(
        "tv-focus grid size-4.5 shrink-0 cursor-pointer place-items-center rounded-[min(var(--tv-btn-radius),calc(var(--radius)*0.45))] border border-line bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cx(
        "tv-focus inline-flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-[min(var(--tv-btn-radius),9999px)] border-2 border-transparent bg-line transition-colors data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4.5 rounded-[min(var(--tv-btn-radius),9999px)] bg-background shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform data-[state=checked]:translate-x-[1.125rem]" />
    </SwitchPrimitive.Root>
  );
}

export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioPrimitive.Root>) {
  return (
    <RadioPrimitive.Root className={cx("grid gap-2", className)} {...props} />
  );
}

export function RadioItem({
  className,
  ...props
}: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cx(
        "tv-focus grid size-4.5 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-background data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
    </RadioPrimitive.Item>
  );
}
