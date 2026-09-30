import { describe, expect, it } from "vitest";
import { isTyping, type KeyInput, shortcutFor } from "./shortcuts";

const key = (k: string, mods: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe("shortcutFor", () => {
  it("maps undo and redo per platform", () => {
    expect(shortcutFor(key("z", { metaKey: true }), false, true)).toEqual({
      type: "undo",
    });
    expect(
      shortcutFor(key("Z", { metaKey: true, shiftKey: true }), false, true),
    ).toEqual({ type: "redo" });
    expect(shortcutFor(key("z", { ctrlKey: true }), false, false)).toEqual({
      type: "undo",
    });
    expect(shortcutFor(key("y", { ctrlKey: true }), false, false)).toEqual({
      type: "redo",
    });
    // The other platform's modifier does nothing.
    expect(shortcutFor(key("z", { ctrlKey: true }), false, true)).toBeNull();
  });

  it("leaves undo to text fields while typing, but still copies the link", () => {
    expect(shortcutFor(key("z", { ctrlKey: true }), true, false)).toBeNull();
    expect(shortcutFor(key("s", { ctrlKey: true }), true, false)).toEqual({
      type: "copy-link",
    });
  });

  it("maps single keys only when not typing, and not on repeat", () => {
    expect(shortcutFor(key("d"), false, false)).toEqual({
      type: "toggle-mode",
    });
    expect(shortcutFor(key("d"), true, false)).toBeNull();
    expect(shortcutFor(key("d", { repeat: true }), false, false)).toBeNull();
    expect(shortcutFor(key("2"), false, false)).toEqual({
      type: "page",
      index: 1,
    });
    expect(shortcutFor(key("0"), false, false)).toBeNull();
    expect(shortcutFor(key("d", { altKey: true }), false, false)).toBeNull();
  });

  it("ignores IME composition", () => {
    expect(
      shortcutFor(key("d", { isComposing: true }), false, false),
    ).toBeNull();
  });
});

describe("isTyping", () => {
  const input = (type: string) =>
    ({ tagName: "INPUT", type }) as unknown as EventTarget;

  it("treats text fields as typing, and sliders or buttons as not", () => {
    expect(isTyping(input("text"))).toBe(true);
    expect(isTyping(input("email"))).toBe(true);
    expect(isTyping(input("range"))).toBe(false);
    expect(isTyping(input("checkbox"))).toBe(false);
    expect(isTyping({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(
      true,
    );
    expect(isTyping({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(
      false,
    );
    expect(
      isTyping({
        tagName: "DIV",
        isContentEditable: true,
      } as unknown as EventTarget),
    ).toBe(true);
    expect(isTyping(null)).toBe(false);
  });
});
