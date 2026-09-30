// The Studio end to end (plan M6): share links round-trip, import and
// export work in a real browser, and a PNG capture embeds the theme's
// Google Fonts (the SnapDOM acceptance check from the decisions log).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { encodeTheme } from "../src/core/codec/encode";
import { ThemeSchemaV1 } from "../src/core/theme/schema";

// Playwright runs from the project root.
const fixture = (name: string) =>
  readFileSync(join("src/core/import/fixtures", name), "utf8");

/** Opens Export and returns globals.css as the dialog shows it. */
async function exportedCss(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog");
  const css = await dialog
    .getByRole("textbox", { name: "Contents of globals.css" })
    .inputValue();
  await dialog.getByRole("button", { name: "Close" }).click();
  return css;
}

test("an edited theme survives its share link", async ({ page, context }) => {
  await page.goto("/studio");
  await page.getByLabel("Theme name").fill("E2E Grove");
  await page
    .getByRole("group", { name: "Preset" })
    .getByRole("button", { name: "Soft" })
    .click();
  await expect(page).toHaveURL(/[?&]t=/);
  const before = await exportedCss(page);
  expect(before).toContain('Thevio theme "E2E Grove"');

  const copy = await context.newPage();
  await copy.goto(page.url());
  await expect(copy.getByLabel("Theme name")).toHaveValue("E2E Grove");
  await expect(
    copy
      .getByRole("group", { name: "Preset" })
      .getByRole("button", { name: "Soft" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await exportedCss(copy)).toBe(before);
});

test("importing a pasted globals.css applies it, and undo restores", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Import a theme" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Theme to import")
    .fill(fixture("tweakcn-catppuccin.css"));
  await expect(dialog.getByText("CSS (globals.css)")).toBeVisible();
  await dialog.getByRole("button", { name: "Apply (undoable)" }).click();

  await expect(page.getByLabel("Theme name")).toHaveValue("Imported");
  const css = await exportedCss(page);
  // catppuccin's primary survives exactly (oklch(0.5547 0.2503 297.0156)).
  expect(css).toContain("--primary: oklch(0.5547 0.2503 297.02);");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByLabel("Theme name")).toHaveValue("Untitled");
});

test("Download all builds a ZIP of every export plus a preview PNG", async ({
  page,
}) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download all (.zip)" }).click(),
  ]);
  const zip = unzipSync(new Uint8Array(readFileSync(await download.path())));
  const names = Object.keys(zip);
  for (const name of [
    "globals.css",
    "DESIGN.md",
    "tokens/base.tokens.json",
    "tokens/thevio.resolver.json",
    "figma/Light.tokens.json",
    "registry/untitled.json",
  ]) {
    expect(names).toContain(name);
  }
  const png = names.find((name) => name.endsWith(".png"));
  expect(png).toBeDefined();
  // PNG signature.
  expect([...(zip[png ?? ""] ?? []).slice(0, 4)]).toEqual([
    0x89, 0x50, 0x4e, 0x47,
  ]);
});

test("a PNG capture embeds the theme's Google Fonts", async ({
  page,
}, info) => {
  const t = encodeTheme(
    ThemeSchemaV1.parse({
      v: 1,
      name: "Font check",
      fonts: { sans: "Manrope", heading: "Fraunces" },
    }),
  );
  await page.goto(`/studio?t=${t}`);
  await page.waitForFunction(
    async () => {
      await document.fonts.ready;
      return (
        document.fonts.check('600 1em "Fraunces"') &&
        document.fonts.check('1em "Manrope"')
      );
    },
    undefined,
    { timeout: 15_000 },
  );

  // The same SnapDOM build the app lazy-loads, run on the live preview: its
  // SVG must carry the fonts as embedded @font-face data.
  await page.route("**/__e2e/snapdom.mjs", (route) =>
    route.fulfill({
      path: "node_modules/@zumer/snapdom/dist/snapdom.mjs",
      contentType: "text/javascript",
    }),
  );
  const svg = await page.evaluate(async () => {
    const url = "/__e2e/snapdom.mjs";
    const { snapdom } = await import(/* webpackIgnore: true */ url);
    const preview = document.querySelector<HTMLElement>(".tv-preview");
    if (!preview) throw new Error("no preview");
    const result = await snapdom(preview, { embedFonts: true });
    const raw: string = result.url;
    return decodeURIComponent(raw.slice(raw.indexOf(",") + 1));
  });
  for (const family of ["Fraunces", "Manrope"]) {
    expect(svg).toMatch(new RegExp(`font-family:\\s*["']?${family}`));
  }
  expect(svg).toMatch(/url\(["']?data:(font|application)\/[\w+.-]+;base64,/);

  // And the app's own PNG button, saved for a visual check.
  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PNG" }).click(),
  ]);
  const file = info.outputPath("font-check.png");
  await download.saveAs(file);
  await info.attach("preview", { path: file, contentType: "image/png" });
  expect(readFileSync(file).length).toBeGreaterThan(20_000);
});
