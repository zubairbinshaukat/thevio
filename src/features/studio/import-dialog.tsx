"use client";

// Import: paste a globals.css, tweakcn or shadcn registry JSON, a Thevio
// link or any Thevio export; see what was read and what the contrast fixer
// would change; apply it as one undoable edit. Same core as POST /api/theme.
// Loaded only when opened (studio.tsx).

import { Dialog } from "radix-ui";
import { useDeferredValue, useId, useState } from "react";
import { type ImportResult, importTheme } from "@/core/import/import";
import type { Theme } from "@/core/theme/schema";
import { validateAndFix } from "@/core/theme/validate-and-fix";
import { cx } from "@/lib/cx";
import { useStudioRoot } from "./controls";
import { XIcon } from "./icons";

const FORMAT_LABELS: Record<
  Extract<ImportResult, { ok: true }>["format"],
  string
> = {
  "thevio-link": "Thevio link or export",
  "thevio-json": "Thevio theme JSON",
  css: "CSS (globals.css)",
  tweakcn: "tweakcn theme JSON",
  "shadcn-registry": "shadcn registry item",
};

export default function ImportDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (theme: Theme) => void;
}) {
  const root = useStudioRoot();
  const id = useId();
  const [text, setText] = useState("");
  const [fixContrast, setFixContrast] = useState(true);

  // Parsing a large paste shouldn't block typing into the box.
  const source = useDeferredValue(text);
  const imported = source.trim() ? importTheme(source) : null;
  const fixed = imported?.ok === true ? validateAndFix(imported.theme) : null;
  const contrastFixes =
    fixed?.ok === true
      ? fixed.fixes.filter((fix) => fix.kind === "contrast")
      : [];

  function apply() {
    if (!imported?.ok) return;
    onApply(fixContrast && fixed?.ok ? fixed.theme : imported.theme);
    setText("");
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={root}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
        <Dialog.Content className="surface fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(40rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Dialog.Title className="font-medium text-sm">
              Import a theme
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-muted-foreground text-xs">
            Paste a shadcn or tweakcn globals.css, tweakcn or shadcn registry
            JSON, a Thevio link, or any file Thevio exported. Colours come
            through exactly.
          </Dialog.Description>

          <label htmlFor={id} className="sr-only">
            Theme to import
          </label>
          <textarea
            id={id}
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            spellCheck={false}
            placeholder={":root {\n  --primary: oklch(0.55 0.2 290);\n  …\n}"}
            className="h-48 w-full resize-y rounded-lg bg-sunken p-3 font-mono text-xs leading-5 ring-1 ring-edge focus-visible:outline-2 focus-visible:outline-ring"
          />

          {imported && !imported.ok && (
            <p role="alert" className="text-destructive text-xs">
              {imported.error}
            </p>
          )}

          {imported?.ok && (
            <div className="grid gap-2 rounded-lg bg-sunken p-3 text-xs ring-1 ring-edge">
              <p>
                <span className="font-medium">
                  {FORMAT_LABELS[imported.format]}
                </span>
                <span className="text-muted-foreground">
                  {" · "}
                  {imported.theme.name}
                  {imported.pinned > 0 &&
                    ` · ${imported.pinned} colour${imported.pinned === 1 ? "" : "s"} kept exactly`}
                </span>
              </p>
              {imported.notes.length > 0 && (
                <ul className="grid gap-1 text-muted-foreground">
                  {imported.notes.map((note) => (
                    <li
                      key={note.message}
                      className={cx(
                        note.level === "warning" && "text-foreground",
                      )}
                    >
                      {note.level === "warning" ? "⚠ " : "· "}
                      {note.message}
                    </li>
                  ))}
                </ul>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fixContrast}
                  disabled={contrastFixes.length === 0}
                  onChange={(event) =>
                    setFixContrast(event.currentTarget.checked)
                  }
                />
                {contrastFixes.length === 0
                  ? "Every contrast pair already passes WCAG 2."
                  : `Fix ${contrastFixes.length} failing contrast pair${contrastFixes.length === 1 ? "" : "s"}`}
              </label>
              {fixContrast && contrastFixes.length > 0 && (
                <ul className="grid gap-1 font-mono text-muted-foreground">
                  {contrastFixes.map((fix) =>
                    fix.kind === "contrast" ? (
                      <li key={`${fix.mode}-${fix.token}`}>
                        {fix.mode} {fix.token}: {fix.before.toFixed(2)} →{" "}
                        {fix.after.toFixed(2)}:1
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Dialog.Close className="inline-flex h-8 shrink-0 items-center rounded-lg px-3 font-medium text-[0.8125rem] text-muted-foreground hover:bg-foreground/6 hover:text-foreground">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              disabled={!imported?.ok}
              onClick={apply}
              className="inline-flex h-8 shrink-0 items-center rounded-lg bg-primary px-3 font-medium text-[0.8125rem] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Apply (undoable)
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
