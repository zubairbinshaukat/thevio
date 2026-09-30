"use client";

// Export: every format, previewed, copied or downloaded one file at a time,
// or all at once as a ZIP with a PNG of the preview. Loaded only when opened
// (studio.tsx), because it pulls in every exporter.

import { Dialog } from "radix-ui";
import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";
import { encodeTheme } from "@/core/codec/encode";
import { slug } from "@/core/export/format";
import { allExportFiles, EXPORT_FORMATS } from "@/core/export/formats";
import { REGISTRY_NOTE } from "@/core/export/shadcn-registry";
import type { ResolvedTheme } from "@/core/theme/resolve";
import { cx } from "@/lib/cx";
import { Segmented, useStudioRoot } from "./controls";
import { DownloadIcon, ImageIcon, XIcon } from "./icons";
import { capturePng, fileName, saveFile, zipFiles } from "./save";
import { copyText } from "./share";

type Busy = "zip" | "png" | null;

export default function ExportDialog({
  resolved,
  preview,
  open,
  onOpenChange,
}: {
  resolved: ResolvedTheme;
  /** The live preview element, for the PNG. */
  preview: HTMLElement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const root = useStudioRoot();
  const [formatId, setFormatId] = useState(EXPORT_FORMATS[0]?.id ?? "css");
  const [path, setPath] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const format =
    EXPORT_FORMATS.find((entry) => entry.id === formatId) ?? EXPORT_FORMATS[0];
  const files = format ? format.files(resolved) : [];
  const file = files.find((entry) => entry.path === path) ?? files[0];
  const name = slug(resolved.theme.name);
  const origin = typeof location === "undefined" ? "" : location.origin;
  const install = `npx shadcn@latest add ${origin}/r/t/${encodeTheme(resolved.theme)}.json`;

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(
        () => setCopied((current) => (current === key ? null : current)),
        1600,
      );
    }
  }

  async function run(kind: Exclude<Busy, null>, task: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch {
      setError(
        kind === "png"
          ? "The PNG capture failed. Try again once the fonts have loaded."
          : "The ZIP couldn't be built.",
      );
    } finally {
      setBusy(null);
    }
  }

  const png = async () => {
    if (!preview) throw new Error("no preview");
    return new Uint8Array(await (await capturePng(preview)).arrayBuffer());
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={root}>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/20" />
        <Dialog.Content
          aria-describedby={undefined}
          className="surface fixed top-1/2 left-1/2 z-50 flex h-[min(44rem,calc(100dvh-1.5rem))] w-[min(60rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl shadow-lg"
        >
          <div className="flex items-center gap-2 border-edge border-b px-4 py-3">
            <Dialog.Title className="font-medium text-sm">
              Export &ldquo;{resolved.theme.name}&rdquo;
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
            >
              <XIcon className="size-4" />
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[14rem_minmax(0,1fr)] sm:grid-rows-1">
            <nav
              aria-label="Formats"
              className="flex gap-1 overflow-x-auto border-edge border-b p-2 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0"
            >
              {EXPORT_FORMATS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={entry.id === format?.id}
                  onClick={() => {
                    setFormatId(entry.id);
                    setPath(null);
                  }}
                  className={cx(
                    "shrink-0 rounded-lg px-2.5 py-2 text-left transition-[background-color,color] duration-200 ease-soft",
                    entry.id === format?.id
                      ? "bg-sunken text-foreground ring-1 ring-edge"
                      : "text-muted-foreground hover:bg-foreground/6 hover:text-foreground",
                  )}
                >
                  <span className="block whitespace-nowrap font-medium text-[0.8125rem]">
                    {entry.label}
                  </span>
                  <span className="hidden text-muted-foreground text-xs sm:block">
                    {entry.description}
                  </span>
                </button>
              ))}
            </nav>

            <div className="flex min-h-0 min-w-0 flex-col gap-3 p-4">
              {format?.id === "shadcn-registry" && (
                <div className="rounded-lg bg-sunken p-3 ring-1 ring-edge">
                  <p className="text-muted-foreground text-xs">
                    {REGISTRY_NOTE}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-xs leading-8">
                      {install}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copy("install", install)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-[0.8125rem] text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      {copied === "install" ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                      {copied === "install" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {files.length > 1 && (
                <Segmented
                  label="File"
                  hideLabel
                  size="sm"
                  value={file?.path ?? null}
                  options={files.map((entry) => ({
                    id: entry.path,
                    label: fileName(entry.path),
                  }))}
                  onChange={setPath}
                  className="overflow-x-auto"
                />
              )}

              {file && (
                <>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
                      {file.path}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copy(file.path, file.contents)}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 font-medium text-[0.8125rem] text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                    >
                      {copied === file.path ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                      {copied === file.path ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveFile(fileName(file.path), file.contents, file.type)
                      }
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 font-medium text-[0.8125rem] text-muted-foreground hover:bg-foreground/6 hover:text-foreground"
                    >
                      <DownloadIcon className="size-4" />
                      Download
                    </button>
                  </div>
                  {/* Read-only textarea: focusable, keyboard-scrollable and
                      selectable without extra wiring. */}
                  <textarea
                    readOnly
                    wrap="off"
                    spellCheck={false}
                    aria-label={`Contents of ${file.path}`}
                    value={file.contents}
                    className="min-h-0 w-full flex-1 resize-none rounded-lg bg-sunken p-3 font-mono text-xs leading-5 ring-1 ring-edge focus-visible:outline-2 focus-visible:outline-ring"
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-edge border-t px-4 py-3">
            <p
              aria-live="polite"
              className="mr-auto text-muted-foreground text-xs"
            >
              {error ??
                (busy === "png"
                  ? "Capturing the preview…"
                  : busy === "zip"
                    ? "Building the ZIP…"
                    : "Exported CSS, SCSS, DESIGN.md, DTCG and registry files restore this theme when pasted into Import.")}
            </p>
            <button
              type="button"
              disabled={busy !== null || !preview}
              onClick={() =>
                void run("png", async () =>
                  saveFile(`${name}.png`, await png(), "image/png"),
                )
              }
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 font-medium text-[0.8125rem] text-muted-foreground hover:bg-foreground/6 hover:text-foreground disabled:opacity-40"
            >
              <ImageIcon className="size-4" />
              PNG
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("zip", async () => {
                  const extra = preview
                    ? {
                        [`preview-${name}.png`]: await png().catch(
                          () => new Uint8Array(),
                        ),
                      }
                    : {};
                  const images = Object.fromEntries(
                    Object.entries(extra).filter(
                      ([, bytes]) => bytes.length > 0,
                    ),
                  );
                  const zip = await zipFiles(allExportFiles(resolved), images);
                  saveFile(`${name}-theme.zip`, zip, "application/zip");
                })
              }
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-[0.8125rem] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <DownloadIcon className="size-4" />
              Download all (.zip)
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
