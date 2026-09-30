"use client";

// The Studio: controls on the left, the live preview on the right (stacked,
// preview first, on small screens). Rendered on the client only, inside a
// Suspense boundary, because it reads the theme from the URL.

import { lazy, Suspense, useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { MoonIcon, SunIcon } from "@/components/icons";
import { toScope } from "@/core/export/scope";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { resolveTheme } from "@/core/theme/resolve";
import { PREVIEW_PAGES } from "@/features/preview/pages/list";
import { PreviewPage } from "@/features/preview/pages/preview-page";
import { ThemeScope } from "@/features/preview/theme-scope";
import { cx } from "@/lib/cx";
import { contrastReport } from "./contrast";
import { Segmented, StudioRoot, ToolButton } from "./controls";
import { sameTheme } from "./edits";
import {
  AlertIcon,
  DownloadIcon,
  ImportIcon,
  MonitorIcon,
  PhoneIcon,
  RedoIcon,
  ResetIcon,
  TabletIcon,
  UndoIcon,
  XIcon,
} from "./icons";
import { Panel } from "./panel";
import { prefetchSavers } from "./save";
import { copyText, SharePopover } from "./share";
import { isTyping, shortcutFor } from "./shortcuts";
import { shareUrl } from "./url";
import { useStudio } from "./use-studio";
import "./studio.css";

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: <MonitorIcon className="size-4" /> },
  {
    id: "tablet",
    label: "Tablet (768px)",
    icon: <TabletIcon className="size-4" />,
  },
  {
    id: "mobile",
    label: "Mobile (390px)",
    icon: <PhoneIcon className="size-4" />,
  },
] as const;
type Viewport = (typeof VIEWPORTS)[number]["id"];

// Both pull in large parts of core (every exporter; the importer), so they
// load on first open; hover or focus on their buttons starts the download.
const loadExport = () => import("./export-dialog");
const loadImport = () => import("./import-dialog");
const ExportDialog = lazy(loadExport);
const ImportDialog = lazy(loadImport);

const FRAME_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "min(100%, 768px)",
  mobile: "min(100%, 390px)",
};

// One column (min 0, so wide previews scroll instead of widening the page),
// then controls beside the preview from `lg`, exactly one screen tall (below
// the site header: 4rem plus its 1px border) so the panel and the preview scroll on their own. Not
// flex-1 there: a flex item's auto min-height would grow it to its content.
const LAYOUT =
  "grid flex-1 grid-cols-[minmax(0,1fr)] lg:h-[calc(100dvh-4rem-1px)] lg:min-h-0 lg:flex-none lg:grid-cols-[20rem_minmax(0,1fr)]";

const isMac = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function Studio() {
  const studio = useStudio();
  const { theme, edit, undo, redo, page, setPage, mode, setMode } = studio;
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<HTMLDivElement | null>(null);
  const [dialog, setDialog] = useState<"export" | "import" | null>(null);

  // Google Fonts: warm both origins before the first family is requested.
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });

  const resolved = resolveTheme(theme);
  const scope = toScope(resolved, mode);
  const report = contrastReport(resolved);
  const origin = typeof location === "undefined" ? "" : location.origin;
  const link = origin ? shareUrl(origin, theme, page) : "";

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const mac = isMac();
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const shortcut = shortcutFor(event, isTyping(event.target), mac);
      if (!shortcut) return;
      event.preventDefault();
      switch (shortcut.type) {
        case "undo":
          return undo();
        case "redo":
          return redo();
        case "toggle-mode":
          return setMode((m) => (m === "dark" ? "light" : "dark"));
        case "page": {
          const target = PREVIEW_PAGES[shortcut.index];
          if (target) void setPage(target.id);
          return;
        }
        case "copy-link":
          void copyText(link).then((ok) =>
            setNotice(ok ? "Link copied" : "Couldn't copy. Use Share instead."),
          );
          return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, setMode, setPage, link]);

  return (
    <StudioRoot value={root}>
      <div ref={setRoot} className={cx("tv-studio", LAYOUT)}>
        <aside
          aria-label="Theme controls"
          className="order-2 border-edge border-t bg-card lg:order-1 lg:overflow-y-auto lg:border-t-0 lg:border-r"
        >
          <Panel theme={theme} report={report} edit={edit} />
        </aside>

        <section
          aria-label="Preview"
          className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0"
        >
          <div className="flex flex-wrap items-center gap-2 border-edge border-b bg-background px-3 py-2">
            <Segmented
              label="Preview page"
              hideLabel
              value={page}
              options={PREVIEW_PAGES}
              onChange={(id) => void setPage(id)}
              className="max-w-full"
            />
            <Segmented
              label="Preview size"
              hideLabel
              value={viewport}
              options={VIEWPORTS}
              onChange={setViewport}
              className="hidden sm:block"
            />
            <ToolButton
              aria-label={`Preview in ${mode === "dark" ? "light" : "dark"} mode (D)`}
              title={`Preview in ${mode === "dark" ? "light" : "dark"} mode (D)`}
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            >
              {mode === "dark" ? <SunIcon /> : <MoonIcon />}
            </ToolButton>

            <div className="ml-auto flex items-center gap-1">
              <p
                aria-live="polite"
                className="px-1 text-muted-foreground text-xs"
              >
                {notice}
              </p>
              <ToolButton
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                onClick={undo}
                disabled={!studio.canUndo}
              >
                <UndoIcon />
              </ToolButton>
              <ToolButton
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                onClick={redo}
                disabled={!studio.canRedo}
              >
                <RedoIcon />
              </ToolButton>
              <ToolButton
                aria-label="Reset to the default theme"
                title="Reset to the default theme (undoable)"
                onClick={() => edit(() => DEFAULT_THEME)}
                disabled={sameTheme(theme, DEFAULT_THEME)}
              >
                <ResetIcon />
              </ToolButton>
              <ToolButton
                aria-label="Import a theme"
                title="Import a theme (globals.css, tweakcn, shadcn registry, Thevio)"
                onPointerEnter={() => void loadImport()}
                onFocus={() => void loadImport()}
                onClick={() => setDialog("import")}
              >
                <ImportIcon />
              </ToolButton>
              <ToolButton
                title="Export: CSS, Tailwind, DTCG, Figma, DESIGN.md, ZIP, PNG"
                onPointerEnter={() => {
                  void loadExport();
                  prefetchSavers();
                }}
                onFocus={() => void loadExport()}
                onClick={() => setDialog("export")}
              >
                <DownloadIcon />
                Export
              </ToolButton>
              {link && <SharePopover url={link} />}
            </div>
          </div>

          <Suspense fallback={null}>
            {dialog === "export" && (
              <ExportDialog
                resolved={resolved}
                preview={preview}
                open
                onOpenChange={(open) => !open && setDialog(null)}
              />
            )}
            {dialog === "import" && (
              <ImportDialog
                open
                onOpenChange={(open) => !open && setDialog(null)}
                onApply={(next) => {
                  edit(() => next);
                  setNotice("Theme imported. Undo restores the previous one.");
                }}
              />
            )}
          </Suspense>

          {studio.brokenLink && (
            <div
              role="alert"
              className="flex items-start gap-2 border-edge border-b bg-warning/12 px-4 py-2.5 text-sm"
            >
              <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="flex-1">
                This link&apos;s theme couldn&apos;t be read (it may be cut
                off), so the Studio opened the default theme.
              </p>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={studio.dismissBrokenLink}
                className="-m-1 grid size-7 shrink-0 place-items-center rounded-md hover:bg-foreground/6"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          <div className="flex h-[78dvh] min-h-0 justify-center bg-sunken p-2 sm:p-4 lg:h-auto lg:flex-1">
            <div
              className="flex min-w-0 flex-col transition-[width] duration-300 ease-soft"
              style={{ width: FRAME_WIDTH[viewport] }}
            >
              <ThemeScope
                ref={setPreview}
                scope={scope}
                className="min-h-0 flex-1 overflow-hidden rounded-xl shadow-lg ring-1 ring-edge"
              >
                {/* The scope stays put and this scrolls, so dialogs (fixed to
                  the scope) centre on what's visible. */}
                <div
                  key={page}
                  className="h-full overflow-y-auto overscroll-contain"
                >
                  <PreviewPage id={page} />
                </div>
              </ThemeScope>
            </div>
          </div>
        </section>
      </div>
    </StudioRoot>
  );
}

/** Shown while the client reads the URL. Same frame, no controls yet. */
export function StudioFallback() {
  return (
    <div aria-busy="true" className={cx("tv-studio", LAYOUT)}>
      <div className="order-2 border-edge border-t bg-card lg:order-1 lg:border-t-0 lg:border-r" />
      <div className="order-1 flex flex-col lg:order-2">
        <div className="h-12.5 border-edge border-b" />
        <div className="h-[78dvh] bg-sunken p-2 sm:p-4 lg:h-auto lg:flex-1">
          <div className="h-full animate-pulse rounded-xl bg-card ring-1 ring-edge" />
        </div>
      </div>
      <span className="sr-only">Loading the Studio…</span>
    </div>
  );
}
