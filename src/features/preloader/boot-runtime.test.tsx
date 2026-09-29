// Runs the real inlined <head> script in jsdom, as the browser would.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOOT_CONFIG, BOOT_SCRIPT, MODE_KEY } from "./boot";

function stubMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches[query] ?? false,
  }));
}

function boot(search = "") {
  history.replaceState(null, "", `/${search}`);
  new Function(BOOT_SCRIPT)();
  const overlay = document.createElement("div");
  overlay.id = "tv-pre";
  document.body.append(overlay);
  return overlay;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("CSS", { supports: () => true });
  stubMedia({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  localStorage.clear();
  Reflect.deleteProperty(document, "fonts");
  delete window.__tv;
});

describe("boot script", () => {
  it("follows the system colour scheme, and a saved choice beats it", () => {
    stubMedia({ "(prefers-color-scheme: dark)": true });
    boot();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    localStorage.setItem(MODE_KEY, "light");
    boot();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("tints the preloader from ?t=", () => {
    // {"v":1,"b":[0.5,0.2,300]}
    const overlay = boot("?t=1N4IgbiBcCMA0ICMoG0AMA6ArLDAmWAzKqgLoC+QA");
    expect(document.documentElement.style.getPropertyValue("--tv-pre")).toBe(
      "oklch(0.5 0.2 300)",
    );
    window.__tv?.mount();
    expect(overlay.style.getPropertyValue("--tv-pre")).toBe(
      "oklch(0.5 0.2 300)",
    );
  });

  it("stays at least the minimum, then reveals and runs callbacks", async () => {
    const overlay = boot();
    const started = vi.fn();
    window.__tv?.on(started);
    window.__tv?.mount();
    expect(overlay.dataset.state).toBe("wait");

    await vi.advanceTimersByTimeAsync(BOOT_CONFIG.minMs - 50);
    expect(overlay.dataset.state).toBe("wait");
    await vi.advanceTimersByTimeAsync(100);
    expect(overlay.dataset.state).toBe("out");
    expect(started).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BOOT_CONFIG.contentDelayMs);
    expect(started).toHaveBeenCalledOnce();
    expect(window.__tv?.revealed).toBe(true);

    await vi.advanceTimersByTimeAsync(BOOT_CONFIG.outMs);
    expect(overlay.dataset.state).toBe("done");
    expect(overlay.hidden).toBe(true);

    // Late subscribers run at once.
    const late = vi.fn();
    window.__tv?.on(late);
    expect(late).toHaveBeenCalledOnce();
  });

  it("never waits past the hard maximum", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise(() => {}) }, // fonts that never settle
    });
    const overlay = boot();
    window.__tv?.mount();
    await vi.advanceTimersByTimeAsync(BOOT_CONFIG.minMs * 2);
    expect(overlay.dataset.state).toBe("wait");
    await vi.advanceTimersByTimeAsync(
      BOOT_CONFIG.maxMs - BOOT_CONFIG.minMs * 2,
    );
    expect(overlay.dataset.state).toBe("out");
  });
});
