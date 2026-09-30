"use client";

// The Studio's state. The in-memory history is the source of truth; the URL
// mirrors its present (`t`) so the address bar is always a share link. The
// URL is read once, on load.

import { useQueryState } from "nuqs";
import {
  useCallback,
  useEffect,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import { decodeTheme } from "@/core/codec/decode";
import type { Mode } from "@/core/theme/resolve";
import type { Theme } from "@/core/theme/schema";
import { normalizeTheme, sameTheme } from "./edits";
import {
  cleanFamily,
  ensureFont,
  type FontStatus,
  fontStatus,
  subscribeFonts,
} from "./fonts";
import {
  createHistory,
  type History,
  type HistoryAction,
  historyReducer,
} from "./history";
import { pageParser, themeParser } from "./url";

export type Edit = (theme: Theme) => Theme;

type Action =
  | HistoryAction<Theme>
  | { type: "edit"; edit: Edit; group?: string; now: number };

function reducer(state: History<Theme>, action: Action): History<Theme> {
  if (action.type !== "edit") return historyReducer(state, action, sameTheme);
  // Edits run here, on the latest state, so two quick edits never race.
  const next = normalizeTheme(action.edit(state.present));
  if (!next) return state;
  return historyReducer(
    state,
    { type: "set", value: next, group: action.group, now: action.now },
    sameTheme,
  );
}

export function useStudio() {
  const [urlTheme, setUrlTheme] = useQueryState("t", themeParser);
  const [rawT] = useQueryState("t");
  const [page, setPage] = useQueryState("p", pageParser);

  // A `t` that doesn't decode (truncated, hand-edited) opens the default
  // theme; say so rather than silently ignore the link.
  const [brokenLink, setBrokenLink] = useState(
    () => rawT !== null && decodeTheme(rawT) === null,
  );

  const [history, dispatch] = useReducer(reducer, urlTheme, createHistory);
  const theme = history.present;

  // Mirror to the URL. Skipped while they match, so loading a link (even a
  // broken one) never rewrites it until the first edit.
  useEffect(() => {
    if (!sameTheme(theme, urlTheme)) void setUrlTheme(theme);
  }, [theme, urlTheme, setUrlTheme]);

  const { sans, mono, heading } = theme.fonts;
  useEffect(() => {
    ensureFont(sans);
    ensureFont(mono);
    if (heading) ensureFont(heading);
  }, [sans, mono, heading]);

  const [mode, setMode] = useState<Mode>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  const edit = useCallback((fn: Edit, group?: string) => {
    dispatch({ type: "edit", edit: fn, group, now: Date.now() });
  }, []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);

  return {
    theme,
    edit,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    page,
    setPage,
    mode,
    setMode,
    brokenLink,
    dismissBrokenLink: () => setBrokenLink(false),
  };
}

/** A name Google can't have (it arrived in a link) counts as an error. */
export function useFontStatus(
  family: string | undefined,
): FontStatus | undefined {
  const clean = family ? cleanFamily(family) : null;
  return useSyncExternalStore(
    subscribeFonts,
    () => (family ? (clean ? fontStatus(clean) : "error") : undefined),
    () => undefined,
  );
}
