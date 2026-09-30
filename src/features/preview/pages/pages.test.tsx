import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toScope } from "@/core/export/scope";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { MODES, resolveTheme } from "@/core/theme/resolve";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
import { ThemeScope } from "../theme-scope";
import { PREVIEW_PAGES } from "./list";
import { PreviewPage } from "./preview-page";

const PRESETS = Object.keys(STYLE_PRESETS) as (keyof typeof STYLE_PRESETS)[];

/** Something each page must show, so a blank render can't pass. */
const LANDMARK = {
  landing: /Product analytics your whole team can read/,
  dashboard: /Overview/,
  "sign-in": /Welcome back/,
  settings: /Acme Labs/,
} as const;

describe("preview pages", () => {
  it("has unique ids", () => {
    const ids = PREVIEW_PAGES.map((page) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const page of PREVIEW_PAGES) {
    for (const preset of PRESETS) {
      for (const mode of MODES) {
        it(`${page.id} renders under ${preset} (${mode})`, () => {
          const scope = toScope(
            resolveTheme({
              ...DEFAULT_THEME,
              components: STYLE_PRESETS[preset],
            }),
            mode,
          );
          render(
            <ThemeScope scope={scope}>
              <PreviewPage id={page.id} />
            </ThemeScope>,
          );
          expect(screen.getAllByText(LANDMARK[page.id]).length).toBeGreaterThan(
            0,
          );
          expect(screen.queryAllByRole("heading", { level: 1 }).length).toBe(
            page.id === "settings" ? 0 : 1,
          );
        });
      }
    }
  }

  it("labels every form field", () => {
    for (const page of PREVIEW_PAGES) {
      const scope = toScope(resolveTheme(DEFAULT_THEME), "light");
      const { container, unmount } = render(
        <ThemeScope scope={scope}>
          <PreviewPage id={page.id} />
        </ThemeScope>,
      );
      // Radix's hidden form mirrors (aria-hidden) aren't fields a user meets.
      for (const field of container.querySelectorAll(
        "input:not([aria-hidden='true']), textarea",
      )) {
        const labelled =
          field.id &&
          container.querySelector(`label[for="${CSS.escape(field.id)}"]`);
        expect(
          Boolean(labelled || field.getAttribute("aria-label")),
          `${page.id}: ${field.outerHTML}`,
        ).toBe(true);
      }
      unmount();
    }
  });
});
