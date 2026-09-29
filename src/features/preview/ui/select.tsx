"use client";

import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";
import { usePortalContainer } from "../theme-scope";
import { CheckIcon, ChevronDownIcon } from "./icons";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

/** Styled like a text field: outline, filled or underline. */
export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cx(
        "tv-field tv-focus inline-flex cursor-pointer items-center justify-between gap-2 text-left data-placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon className="size-4 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  const container = usePortalContainer();
  if (!container) return null;
  // "popper" positions against the trigger; the default item-aligned mode
  // measures the window, which is wrong inside a preview frame.
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cx(
          "tv-overlay z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden p-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cx(
        "relative flex h-[calc(var(--tv-control-h)-0.25rem)] cursor-pointer select-none items-center rounded-[min(var(--tv-btn-radius),calc(var(--radius)*0.8))] pr-8 pl-2 text-sm outline-none data-highlighted:bg-muted",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
