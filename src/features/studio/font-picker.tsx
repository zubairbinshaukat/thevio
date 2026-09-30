"use client";

// A searchable Google Fonts picker (combobox + listbox). Each option is drawn
// in its own face, from tiny `text=` subsets fetched once and only for the
// options scrolled into view. Any Google family can be typed in.

import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
import { CheckIcon } from "@/components/icons";
import {
  FONT_CATEGORY_LABELS,
  FONTS,
  type FontCategory,
  type FontEntry,
} from "@/config/fonts";
import { cx } from "@/lib/cx";
import { useStudioRoot } from "./controls";
import {
  cleanFamily,
  ensurePreviewFonts,
  type FontStatus,
  findFont,
  PREVIEW_PREFIX,
} from "./fonts";
import { AlertIcon, ChevronDownIcon, SearchIcon } from "./icons";

type Choice =
  | { kind: "inherit"; key: string; label: string }
  | { kind: "font"; key: string; font: FontEntry }
  | { kind: "custom"; key: string; family: string };

function choices(
  query: string,
  prefer: FontCategory,
  inheritLabel: string | undefined,
): Choice[] {
  const q = query.trim().toLowerCase();
  const matches = FONTS.filter(
    (font) =>
      !q ||
      font.family.toLowerCase().includes(q) ||
      FONT_CATEGORY_LABELS[font.category].toLowerCase() === q,
  );
  // The role's own category first (mono for code), the rest after, stable.
  const ranked = [
    ...matches.filter((font) => font.category === prefer),
    ...matches.filter((font) => font.category !== prefer),
  ];
  const list: Choice[] = ranked.map((font) => ({
    kind: "font",
    key: font.family,
    font,
  }));
  const custom = cleanFamily(query);
  if (custom && !findFont(custom)) {
    list.push({ kind: "custom", key: `custom:${custom}`, family: custom });
  }
  if (inheritLabel && !q) {
    list.unshift({ kind: "inherit", key: "inherit", label: inheritLabel });
  }
  return list;
}

const optionDomId = (id: string, key: string) =>
  `${id}-opt-${key.replace(/[^a-zA-Z0-9]/g, "_")}`;

function StatusNote({
  family,
  status,
}: {
  family: string;
  status?: FontStatus;
}) {
  if (status === "loading") {
    return <p className="text-muted-foreground text-xs">Loading {family}…</p>;
  }
  if (status === "error") {
    return (
      <p className="flex items-start gap-1.5 text-xs">
        <AlertIcon className="mt-px size-3.5 shrink-0 text-warning" />
        <span>
          Couldn&apos;t load “{family}” from Google Fonts. The preview uses a
          fallback font; exports still name it.
        </span>
      </p>
    );
  }
  return null;
}

export function FontPicker({
  label,
  value,
  onChange,
  prefer,
  status,
  inheritLabel,
}: {
  label: string;
  /** The family, or null when inheriting (see `inheritLabel`). */
  value: string | null;
  onChange: (family: string | null) => void;
  prefer: FontCategory;
  status?: FontStatus;
  /** Offer "same as …" as the first option, meaning `null`. */
  inheritLabel?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const root = useStudioRoot();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  // State, not a ref: the portal mounts a commit after `open` flips, and
  // the observer below must run again once the list exists.
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);

  const list = choices(query, prefer, inheritLabel);
  const activeIndex = Math.min(active, list.length - 1);
  const activeChoice = list[activeIndex];
  const optionId = (key: string) => optionDomId(id, key);

  // Draw each option in its face once it scrolls into view.
  useEffect(() => {
    if (!open || !listEl) return;
    void ensurePreviewFonts();
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.family)
          .filter((family): family is string => Boolean(family));
        if (visible.length === 0) return;
        setSeen((prev) => {
          if (visible.every((family) => prev.has(family))) return prev;
          return new Set([...prev, ...visible]);
        });
      },
      { root: listEl, rootMargin: "64px 0px" },
    );
    for (const choice of list) {
      if (choice.kind !== "font") continue;
      const node = document.getElementById(optionDomId(id, choice.key));
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [open, list, id, listEl]);

  // Keep the active option visible while arrowing through the list.
  useEffect(() => {
    if (!open || !listEl || !activeChoice) return;
    document
      .getElementById(optionDomId(id, activeChoice.key))
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeChoice, id, listEl]);

  function choose(choice: Choice) {
    if (choice.kind === "inherit") onChange(null);
    else onChange(choice.kind === "font" ? choice.font.family : choice.family);
    setOpen(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      const current = choices("", prefer, inheritLabel).findIndex((choice) =>
        choice.kind === "inherit"
          ? value === null
          : choice.kind === "font" && choice.font.family === value,
      );
      setActive(Math.max(0, current));
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = list.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, activeIndex + 1),
      ArrowUp: Math.max(0, activeIndex - 1),
      Home: 0,
      End: last,
      PageDown: Math.min(last, activeIndex + 8),
      PageUp: Math.max(0, activeIndex - 8),
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setActive(move);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeChoice) choose(activeChoice);
    }
  }

  const shown = value ?? inheritLabel ?? "";
  const face = (family: string) =>
    seen.has(family)
      ? { fontFamily: `"${PREVIEW_PREFIX}${family}", var(--font-sans)` }
      : undefined;

  return (
    <div className="grid gap-1.5">
      <span id={`${id}-label`} className="text-muted-foreground text-xs">
        {label}
      </span>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger
          aria-labelledby={`${id}-label ${id}-value`}
          className="flex h-9 w-full items-center gap-2 rounded-lg bg-sunken px-2.5 text-left text-sm ring-1 ring-edge transition-colors hover:bg-foreground/4 data-[state=open]:ring-ring"
        >
          <span
            id={`${id}-value`}
            className="min-w-0 flex-1 truncate"
            style={
              value && status === "ready"
                ? { fontFamily: `"${value}", var(--font-sans)` }
                : undefined
            }
          >
            {shown}
          </span>
          {status === "error" && (
            <AlertIcon
              className="size-3.5 shrink-0 text-warning"
              aria-label="Failed to load"
            />
          )}
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Popover.Trigger>
        <Popover.Portal container={root}>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className="surface z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-xl p-0 shadow-lg"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              document.getElementById(`${id}-search`)?.focus();
            }}
          >
            <div className="flex items-center gap-2 border-edge border-b px-3">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
              <input
                id={`${id}-search`}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={
                  activeChoice ? optionId(activeChoice.key) : undefined
                }
                aria-autocomplete="list"
                aria-label={`Search ${label.toLowerCase()} fonts`}
                placeholder="Search or type any Google font"
                value={query}
                maxLength={60}
                spellCheck={false}
                autoComplete="off"
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div
              ref={setListEl}
              id={listId}
              role="listbox"
              aria-label={`${label} fonts`}
              className="max-h-72 overflow-y-auto overscroll-contain p-1"
            >
              {list.length === 0 && (
                <p className="px-2 py-6 text-center text-muted-foreground text-sm">
                  No match. Font names use letters, digits and spaces.
                </p>
              )}
              {list.map((choice, index) => {
                const selected =
                  choice.kind === "inherit"
                    ? value === null
                    : choice.kind === "font"
                      ? choice.font.family === value
                      : choice.family === value;
                const family =
                  choice.kind === "font" ? choice.font.family : null;
                return (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input owns the keyboard (aria-activedescendant)
                  <div
                    key={choice.key}
                    id={optionId(choice.key)}
                    role="option"
                    aria-selected={selected}
                    // Focus stays in the search field; a click mustn't move it.
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    data-family={family ?? undefined}
                    onPointerMove={() => setActive(index)}
                    onClick={() => choose(choice)}
                    className={cx(
                      "flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg px-2 text-sm",
                      index === activeIndex && "bg-foreground/6",
                    )}
                  >
                    <span
                      className="min-w-0 flex-1 truncate"
                      style={family ? face(family) : undefined}
                    >
                      {choice.kind === "font"
                        ? choice.font.family
                        : choice.kind === "custom"
                          ? `Use “${choice.family}”`
                          : choice.label}
                    </span>
                    {choice.kind === "font" && (
                      <span className="font-mono text-[0.625rem] text-muted-foreground uppercase tracking-wide">
                        {FONT_CATEGORY_LABELS[choice.font.category]}
                      </span>
                    )}
                    <CheckIcon
                      className={cx(
                        "size-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {value && <StatusNote family={value} status={status} />}
    </div>
  );
}
