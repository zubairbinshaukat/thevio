"use client";

// Share: the link is the theme. Copies to the clipboard, and always shows
// the link too, so it can be copied by hand where the clipboard is blocked.

import { Popover } from "radix-ui";
import { useId, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { useStudioRoot } from "./controls";
import { LinkIcon } from "./icons";
import { LONG_LINK_CHARS } from "./url";

/** Resolves true when the text reached the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SharePopover({ url }: { url: string }) {
  const root = useStudioRoot();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const ok = await copyText(url);
    setState(ok ? "copied" : "failed");
    if (!ok) input.current?.select();
  }

  return (
    <Popover.Root onOpenChange={() => setState("idle")}>
      <Popover.Trigger className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-[0.8125rem] text-primary-foreground transition-[opacity,scale] duration-200 ease-soft hover:opacity-90 active:scale-95">
        <LinkIcon className="size-4" />
        Share
      </Popover.Trigger>
      <Popover.Portal container={root}>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="surface z-50 w-[min(26rem,calc(100vw-1.5rem))] rounded-xl p-4 shadow-lg"
        >
          <p className="font-medium text-sm">Share this theme</p>
          <p className="mt-1 text-muted-foreground text-xs">
            The link holds the whole theme. No account, nothing stored.
          </p>
          <div className="mt-3 flex gap-2">
            <label htmlFor={id} className="sr-only">
              Share link
            </label>
            <input
              ref={input}
              id={id}
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="h-9 min-w-0 flex-1 rounded-lg bg-sunken px-2.5 font-mono text-xs ring-1 ring-edge focus-visible:outline-2 focus-visible:outline-ring"
            />
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
            >
              {state === "copied" ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {state === "copied" ? "Copied" : "Copy"}
            </button>
          </div>
          <p
            aria-live="polite"
            className="mt-2 text-muted-foreground text-xs tabular-nums"
          >
            {state === "failed"
              ? "Your browser blocked the clipboard. The link is selected: press Ctrl+C (⌘C on Mac)."
              : url.length > LONG_LINK_CHARS
                ? `${url.length.toLocaleString("en")} characters. Some apps cut links this long; pinned colours add the most.`
                : `${url.length.toLocaleString("en")} characters · ⌘/Ctrl+S copies it from anywhere.`}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
