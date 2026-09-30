"use client";

import { Tooltip } from "radix-ui";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type Ref,
  use,
  useState,
} from "react";
import type { ScopeStyle } from "@/core/export/scope";
import { cx } from "@/lib/cx";
import "./preview.css";

const InScope = createContext(false);
const PortalRoot = createContext<HTMLElement | null>(null);

/**
 * Where preview overlays (Dialog, Popover, Menu, Select, Tooltip) portal to:
 * inside the scope, so they keep its theme. Null until the scope mounts;
 * overlays render nothing until then rather than flash unthemed in <body>.
 */
export function usePortalContainer(): HTMLElement | null {
  return use(PortalRoot);
}

type ThemeScopeProps = {
  /** From `toScope(resolved, mode)`: variables + data attributes. */
  scope: ScopeStyle;
  className?: string;
  children: ReactNode;
  /** The scope element, e.g. for a PNG capture of the preview. */
  ref?: Ref<HTMLDivElement>;
};

/**
 * The root of a live preview. Carries the theme as CSS variables and the
 * component tokens as data attributes (`data-button-style="soft"`, …), which
 * preview.css reads. Never nest scopes: token selectors match any ancestor.
 */
export function ThemeScope({
  scope,
  className,
  children,
  ref,
}: ThemeScopeProps) {
  const nested = use(InScope);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  if (nested && process.env.NODE_ENV !== "production") {
    throw new Error("ThemeScope can't be nested: token selectors would leak.");
  }

  return (
    <InScope value={true}>
      <PortalRoot value={portal}>
        <Tooltip.Provider delayDuration={250}>
          <div
            ref={ref}
            {...scope.attributes}
            style={scope.vars as CSSProperties}
            className={cx("tv-preview", className)}
          >
            {children}
            <div ref={setPortal} data-tv-portal="" />
          </div>
        </Tooltip.Provider>
      </PortalRoot>
    </InScope>
  );
}
