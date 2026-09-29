import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "../theme/defaults";
import { resolveTheme } from "../theme/resolve";
import { STYLE_PRESETS } from "../theme/style-presets";
import { COLOR_TOKENS } from "../theme/tokens";
import { toScope } from "./scope";

describe("toScope", () => {
  const resolved = resolveTheme({
    ...DEFAULT_THEME,
    components: STYLE_PRESETS.soft,
  });

  it("carries every colour token, the component colours and shared vars", () => {
    const { vars } = toScope(resolved, "dark");
    for (const token of COLOR_TOKENS) expect(vars).toHaveProperty(`--${token}`);
    for (const name of [
      "--tv-soft-bg",
      "--tv-soft-fg",
      "--tv-line",
      "--tv-field",
    ]) {
      expect(vars).toHaveProperty(name);
    }
    expect(vars["--radius"]).toBe("0.625rem");
    expect(vars["--tv-btn-radius"]).toBe("9999px");
  });

  it("uses each mode's colours", () => {
    expect(toScope(resolved, "light").vars["--background"]).toBe(
      "oklch(1 0 0)",
    );
    expect(toScope(resolved, "dark").vars["--background"]).not.toBe(
      "oklch(1 0 0)",
    );
  });

  it("exposes the component tokens and the mode as data attributes", () => {
    expect(toScope(resolved, "dark").attributes).toMatchObject({
      "data-surface": "shadow",
      "data-button": "pill",
      "data-button-style": "soft",
      "data-input": "filled",
      "data-focus": "glow",
      "data-tabs": "pill",
      "data-mode": "dark",
    });
  });

  it("never emits `none` in a shadow variable (it breaks shadow lists)", () => {
    const flat = resolveTheme({
      ...DEFAULT_THEME,
      components: STYLE_PRESETS.crisp,
    });
    for (const [name, value] of Object.entries(toScope(flat, "light").vars)) {
      if (name.includes("shadow")) expect(value).not.toBe("none");
    }
  });
});
