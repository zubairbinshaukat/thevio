"use client";

// Overlays portal into the ThemeScope's own root, so they keep the theme,
// and render nothing until that root exists (never unthemed into <body>).

import {
  Dialog as DialogPrimitive,
  DropdownMenu as MenuPrimitive,
  Popover as PopoverPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { usePortalContainer } from "../theme-scope";
import { XIcon } from "./icons";

function ScopedPortal({
  children,
  Portal,
}: {
  children: ReactNode;
  Portal: ComponentType<{
    container?: HTMLElement | null;
    children?: ReactNode;
  }>;
}) {
  const container = usePortalContainer();
  if (!container) return null;
  return <Portal container={container}>{children}</Portal>;
}

const pop = "tv-overlay z-50";

// --- Dialog --------------------------------------------------------------

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <ScopedPortal Portal={DialogPrimitive.Portal}>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
      <DialogPrimitive.Content
        className={cx(
          pop,
          "fixed top-1/2 left-1/2 w-[min(92%,26rem)] -translate-x-1/2 -translate-y-1/2 p-(--tv-card-pad)",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="tv-focus absolute top-3 right-3 grid size-7 cursor-pointer place-items-center rounded-(--tv-btn-radius) text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ScopedPortal>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cx("pr-8 font-semibold text-base", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cx("mt-1.5 text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// --- Popover -------------------------------------------------------------

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <ScopedPortal Portal={PopoverPrimitive.Portal}>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cx(pop, "w-64 p-4", className)}
        {...props}
      />
    </ScopedPortal>
  );
}

// --- Dropdown menu -------------------------------------------------------

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;

export function MenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <ScopedPortal Portal={MenuPrimitive.Portal}>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cx(pop, "min-w-44 p-1", className)}
        {...props}
      />
    </ScopedPortal>
  );
}

export function MenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cx(
        "flex h-[calc(var(--tv-control-h)-0.25rem)] cursor-pointer select-none items-center gap-2 rounded-[min(var(--tv-btn-radius),calc(var(--radius)*0.8))] px-2 text-sm outline-none data-highlighted:bg-muted data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />;
}

// --- Tooltip -------------------------------------------------------------

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <ScopedPortal Portal={TooltipPrimitive.Portal}>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cx(
          "z-50 rounded-[min(var(--tv-btn-radius),calc(var(--radius)*0.8))] bg-foreground px-2.5 py-1.5 text-background text-xs",
          className,
        )}
        {...props}
      />
    </ScopedPortal>
  );
}
