import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeTheme } from "@/core/codec/decode";
import { encodeTheme } from "@/core/codec/encode";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { applyStylePreset, setBrand } from "./edits";
import { Studio } from "./studio";

function renderStudio(search = "") {
  const updates: UrlUpdateEvent[] = [];
  const view = render(
    <NuqsTestingAdapter
      searchParams={search}
      rateLimitFactor={0}
      hasMemory
      onUrlUpdate={(event) => updates.push(event)}
    >
      <Studio />
    </NuqsTestingAdapter>,
  );
  const preview = () =>
    view.container.querySelector(".tv-preview") as HTMLElement;
  const lastT = () => updates.at(-1)?.searchParams.get("t") ?? null;
  return { ...view, updates, preview, lastT };
}

const slider = (name: string) =>
  screen.getByRole("slider", { name }) as HTMLInputElement;

beforeEach(() => {
  // Font loading and previews talk to Google; keep tests offline.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("offline"))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Studio", () => {
  it("opens the default theme on the landing page", () => {
    const { preview } = renderStudio();
    expect(preview().dataset.mode).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: "Product analytics your whole team can read",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset to the default theme" }),
    ).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("loads the theme and page from the link", () => {
    const crisp = applyStylePreset(DEFAULT_THEME, "crisp");
    const { preview } = renderStudio(`?t=${encodeTheme(crisp)}&p=sign-in`);
    expect(preview().dataset.button).toBe("square");
    expect(screen.getByRole("button", { name: "Crisp" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  it("says so when a link can't be read, and keeps the URL until an edit", () => {
    const { updates, preview } = renderStudio("?t=1broken!!&p=nowhere");
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't be read/);
    expect(preview().dataset.button).toBe("rounded");
    expect(updates).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mirrors edits to the URL, one undo step per drag", async () => {
    const { lastT, preview } = renderStudio();
    const radius = slider("Radius");

    for (const value of ["0.7", "0.8", "0.9", "1"]) {
      fireEvent.change(radius, { target: { value } });
    }
    await waitFor(() => expect(decodeTheme(lastT())?.radius).toBe(1));
    expect(preview().style.getPropertyValue("--radius")).toBe("1rem");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(radius.value).toBe("0.625");
    // Back at the default theme, the parameter is removed.
    await waitFor(() => expect(lastT()).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(radius.value).toBe("1");
  });

  it("switches the preview page and mode", async () => {
    const { updates, preview } = renderStudio();
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    await waitFor(() =>
      expect(updates.at(-1)?.searchParams.get("p")).toBe("dashboard"),
    );
    expect(screen.getByRole("heading", { name: "Overview" })).toBeVisible();

    const before = preview().dataset.mode;
    fireEvent.keyDown(document.body, { key: "d" });
    expect(preview().dataset.mode).not.toBe(before);

    fireEvent.keyDown(document.body, { key: "3" });
    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  it("applies a style preset and single tokens", () => {
    const { preview } = renderStudio();
    const presets = screen.getByRole("group", { name: "Preset" });
    fireEvent.click(within(presets).getByRole("button", { name: "Soft" }));
    expect(preview().dataset.surface).toBe("shadow");

    const tabs = screen.getByRole("group", { name: "Tabs" });
    fireEvent.click(within(tabs).getByRole("button", { name: "Underline" }));
    expect(preview().dataset.tabs).toBe("underline");
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("edits the brand colour from text, and rejects what isn't a colour", async () => {
    const { lastT } = renderStudio();
    const field = screen.getByRole("textbox", { name: "Colour" });

    fireEvent.change(field, { target: { value: "not a colour" } });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(lastT()).toBeNull();

    fireEvent.change(field, { target: { value: "#16a34a" } });
    expect(field).not.toHaveAttribute("aria-invalid");
    await waitFor(() =>
      expect(decodeTheme(lastT())?.colors.brand[2]).toBeCloseTo(149.6, 0),
    );
  });

  it("keeps the hue when chroma goes to zero and back", () => {
    renderStudio();
    const hue = slider("Hue").value;
    fireEvent.change(slider("Chroma"), { target: { value: "0" } });
    fireEvent.change(slider("Chroma"), { target: { value: "0.15" } });
    expect(slider("Hue").value).toBe(hue);
  });

  it("fixes failing contrast in one click", () => {
    const pale = setBrand(DEFAULT_THEME, [0.95, 0.04, 100]);
    renderStudio(`?t=${encodeTheme(pale)}`);
    expect(screen.getByText(/pairs fail WCAG 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fix all" }));
    expect(screen.getByText(/pairs pass WCAG 2/)).toBeInTheDocument();
    expect(screen.getByText(/pinned colour/)).toBeInTheDocument();
  });

  it("copies the share link with Ctrl+S", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderStudio(`?t=${encodeTheme(applyStylePreset(DEFAULT_THEME, "soft"))}`);

    await act(async () => {
      fireEvent.keyDown(document.body, { key: "s", ctrlKey: true });
    });
    const url = new URL(writeText.mock.calls[0]?.[0] ?? "");
    expect(url.pathname).toBe("/studio");
    expect(decodeTheme(url.searchParams.get("t"))?.components.buttonShape).toBe(
      "pill",
    );
    expect(screen.getByText("Link copied")).toBeInTheDocument();
  });
});
