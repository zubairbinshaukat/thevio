"use client";
// Tiny and rarely re-rendered: the compiler's memo slots aren't worth their bytes.
"use no memo";

import { type ReactNode, useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { cx } from "@/lib/cx";

type CopyButtonProps = {
  /** Text to copy. A path is copied as a full URL on this origin. */
  text: string;
  label?: ReactNode;
  className?: string;
};

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    const value = text.startsWith("/") ? location.origin + text : text;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {}
  }

  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : "Copy"}
      className={cx(
        "inline-flex items-center gap-1.5 transition-[color,background-color,scale] duration-200 ease-soft active:scale-95",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
