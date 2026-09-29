import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toScope } from "@/core/export/scope";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { resolveTheme } from "@/core/theme/resolve";
import { STYLE_PRESETS } from "@/core/theme/style-presets";
import { SamplePage } from "./sample-page";
import { ThemeScope } from "./theme-scope";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "./ui/overlay";

const scope = (preset: keyof typeof STYLE_PRESETS, mode: "light" | "dark") =>
  toScope(
    resolveTheme({ ...DEFAULT_THEME, components: STYLE_PRESETS[preset] }),
    mode,
  );

describe("ThemeScope", () => {
  it("puts the theme's variables and tokens on its root", () => {
    const { container } = render(
      <ThemeScope scope={scope("crisp", "dark")}>
        <p>inside</p>
      </ThemeScope>,
    );
    const root = container.querySelector(".tv-preview") as HTMLElement;
    expect(root.dataset.surface).toBe("flat");
    expect(root.dataset.tabs).toBe("underline");
    expect(root.dataset.mode).toBe("dark");
    expect(root.style.getPropertyValue("--tv-btn-radius")).toBe("0.125rem");
    expect(root.style.getPropertyValue("--primary")).toMatch(/^oklch\(/);
    // Never the chrome's class: `.dark` would pull in the site's variables.
    expect(root.classList.contains("dark")).toBe(false);
  });

  it("refuses to nest, since token selectors match any ancestor", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <ThemeScope scope={scope("shadcn", "light")}>
          <ThemeScope scope={scope("soft", "light")}>x</ThemeScope>
        </ThemeScope>,
      ),
    ).toThrow(/can't be nested/);
  });

  it("portals overlays inside the scope, so they keep its theme", async () => {
    const { container } = render(
      <ThemeScope scope={scope("soft", "light")}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Scoped</DialogTitle>
          </DialogContent>
        </Dialog>
      </ThemeScope>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    const root = container.querySelector(".tv-preview");
    await waitFor(() => expect(root?.contains(dialog)).toBe(true));
  });

  it.each(Object.keys(STYLE_PRESETS) as (keyof typeof STYLE_PRESETS)[])(
    "renders the sample page under %s",
    (preset) => {
      render(
        <ThemeScope scope={scope(preset, "light")}>
          <SamplePage id={preset} />
        </ThemeScope>,
      );
      expect(screen.getByRole("tablist", { name: "Settings" })).toBeVisible();
      expect(screen.getByLabelText("Name")).toHaveValue("Acme Labs");
    },
  );
});
