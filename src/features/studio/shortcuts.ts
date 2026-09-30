// Studio keyboard shortcuts, as a pure mapping from a key event to an action.
//   ⌘/Ctrl+Z undo · ⇧⌘/Ctrl+Shift+Z or Ctrl+Y redo · ⌘/Ctrl+S copy link
//   D light/dark preview · 1–9 preview page
// Single keys never fire while typing; text fields keep their own undo.

export type Shortcut =
  | { type: "undo" }
  | { type: "redo" }
  | { type: "copy-link" }
  | { type: "toggle-mode" }
  | { type: "page"; index: number };

export type KeyInput = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
};

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);

/** True when keys typed into `target` are text, not commands. */
export function isTyping(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).tagName !== "string") return false;
  const element = target as HTMLElement;
  if (element.isContentEditable) return true;
  if (element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    return true;
  }
  if (element.tagName === "INPUT") {
    return TEXT_INPUT_TYPES.has((element as HTMLInputElement).type);
  }
  return false;
}

export function shortcutFor(
  event: KeyInput,
  typing: boolean,
  mac: boolean,
): Shortcut | null {
  if (event.isComposing) return null;
  const key = event.key.toLowerCase();
  const mod = mac
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;

  if (mod && !event.altKey) {
    if (key === "s" && !event.shiftKey) return { type: "copy-link" };
    if (typing) return null;
    if (key === "z")
      return event.shiftKey ? { type: "redo" } : { type: "undo" };
    if (key === "y" && !mac && !event.shiftKey) return { type: "redo" };
    return null;
  }

  const bare = !event.metaKey && !event.ctrlKey && !event.altKey;
  if (!bare || typing || event.repeat) return null;
  if (key === "d" && !event.shiftKey) return { type: "toggle-mode" };
  if (/^[1-9]$/.test(event.key)) {
    return { type: "page", index: Number(event.key) - 1 };
  }
  return null;
}
