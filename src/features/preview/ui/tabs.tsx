"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "@/lib/cx";

export const Tabs = TabsPrimitive.Root;

/** Segmented, pill or underline, from `data-tabs`. */
export function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cx("tv-tabs", className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cx(
        "tv-tab tv-focus inline-flex cursor-pointer items-center justify-center whitespace-nowrap text-sm transition-[color,background-color,box-shadow] duration-150",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cx("tv-focus mt-(--tv-gap) rounded-(--radius)", className)}
      {...props}
    />
  );
}
