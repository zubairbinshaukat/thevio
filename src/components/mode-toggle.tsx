"use client";
// Tiny and rarely re-rendered: the compiler's memo slots aren't worth their bytes.
"use no memo";

import { useLayoutEffect } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";
import { MODE_KEY } from "@/features/preloader/mode";

function apply(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function saved(): string | null {
  try {
    return localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
}

/**
 * Light/dark switch. The <head> script already applied the mode before first
 * paint; the icons follow the `.dark` class, so nothing here depends on
 * render-time state and there's no hydration mismatch.
 */
export function ModeToggle() {
  // Re-apply after React's dev remount clears <html> attributes (no-op in prod).
  useLayoutEffect(() => {
    const mode = saved();
    apply(
      mode
        ? mode === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }, []);

  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    apply(dark);
    try {
      localStorage.setItem(MODE_KEY, dark ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark mode"
      className="grid size-9 place-items-center rounded-full text-muted-foreground transition-[color,background-color,scale] duration-200 ease-soft hover:bg-foreground/6 hover:text-foreground active:scale-95"
    >
      <SunIcon className="size-4.5 dark:hidden" strokeWidth={1.75} />
      <MoonIcon className="hidden size-4.5 dark:block" strokeWidth={1.75} />
    </button>
  );
}
