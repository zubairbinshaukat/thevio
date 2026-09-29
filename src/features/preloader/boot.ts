// The blocking <head> script: runs during HTML parsing, before first paint.
//
// 1. Applies the colour mode (saved choice, else the system's).
// 2. Tints the preloader with the shared theme's primary (`?t=`).
// 3. Exposes `window.__tv`: the overlay calls `mount()` right after it is
//    parsed; page code calls `on(fn)` to run when the reveal starts.
//
// `pickColor` and `tvBoot` are inlined with `.toString()`, like lzDecodeUri:
// each must stay SELF-CONTAINED (no imports, no outer variables).

import { MAX_ENCODED_LENGTH } from "@/core/codec/decode";
import { CODEC_LZ_JSON } from "@/core/codec/encode";
import { FIELD_KEYS, keyForPath } from "@/core/codec/keys";
import { lzDecodeUri } from "./lz-decode";
import { MODE_KEY } from "./mode";

export { MODE_KEY };

export type TvHandle = {
  /** True once the curtain has started to lift. */
  revealed: boolean;
  /** Run `fn` when the reveal starts (now, if it already has). */
  on: (fn: () => void) => void;
  /** Called by the overlay's own inline script. */
  mount: () => void;
};

declare global {
  interface Window {
    __tv?: TvHandle;
  }
}

export type BootConfig = {
  modeKey: string;
  prefix: string;
  maxLength: number;
  /** Share-link keys to try, in order: light primary override, then brand. */
  keys: readonly string[];
  minMs: number;
  maxMs: number;
  contentDelayMs: number;
  outMs: number;
  fadeMs: number;
};

const lightPrimary = keyForPath("overrides.light.primary");
if (!lightPrimary) throw new Error("No share-link key for the light primary");

export const BOOT_CONFIG: BootConfig = {
  modeKey: MODE_KEY,
  prefix: CODEC_LZ_JSON,
  maxLength: MAX_ENCODED_LENGTH,
  keys: [lightPrimary, FIELD_KEYS["colors.brand"]],
  // Shown at least this long, so it never flashes.
  minMs: 600,
  // Revealed by this time after navigation starts, whatever is still loading.
  // The CSS-only fallback in styles.ts fires at 3.2s if this script fails.
  maxMs: 2800,
  // Content starts rising this long after the curtain starts moving.
  contentDelayMs: 180,
  // Curtain length (0.9s + the 110ms follow panel), then the overlay hides.
  outMs: 1100,
  // Reduced motion: a plain fade.
  fadeMs: 260,
};

/** The theme's primary as a CSS colour, from a `?t=` share link, or null. */
export function pickColor(
  search: string,
  decode: (input: string) => string | null,
  cfg: Pick<BootConfig, "prefix" | "maxLength" | "keys">,
  supports: (color: string) => boolean,
): string | null {
  const match = /[?&]t=([^&#]*)/.exec(search);
  if (!match?.[1]) return null;
  let encoded: string;
  try {
    encoded = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (encoded.charAt(0) !== cfg.prefix || encoded.length > cfg.maxLength) {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(decode(encoded.slice(1)) || "null");
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  for (const key of cfg.keys) {
    const value = (data as Record<string, unknown>)[key];
    if (Array.isArray(value) && (value.length === 3 || value.length === 4)) {
      const [l, c, h] = value;
      const ok = value.every(
        (n) => typeof n === "number" && Number.isFinite(n),
      );
      if (ok && l >= 0 && l <= 1 && c >= 0 && c <= 0.5) {
        return `oklch(${l} ${c} ${h})`;
      }
    }
    if (typeof value === "string" && value.length < 64 && supports(value)) {
      return value;
    }
  }
  return null;
}

export function tvBoot(
  decode: typeof lzDecodeUri,
  pick: typeof pickColor,
  cfg: BootConfig,
): void {
  const win = window;
  const doc = document;
  const root = doc.documentElement;
  const queue: (() => void)[] = [];
  const tv: TvHandle = {
    revealed: false,
    on: (fn) => {
      if (tv.revealed) fn();
      else queue.push(fn);
    },
    mount: () => {},
  };
  win.__tv = tv;

  let mode: string | null = null;
  try {
    mode = localStorage.getItem(cfg.modeKey);
  } catch {}
  const dark =
    mode === "dark" ||
    (mode !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";

  let color: string | null = null;
  try {
    color = pick(location.search, decode, cfg, (value) =>
      CSS.supports("color", value),
    );
  } catch {}
  if (color) root.style.setProperty("--tv-pre", color);

  tv.mount = () => {
    const overlay = doc.getElementById("tv-pre");
    if (!overlay) return;
    // Also on the overlay itself: in dev, React resets <html> attributes.
    if (color) overlay.style.setProperty("--tv-pre", color);
    overlay.dataset.state = "wait";
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shownAt = performance.now();
    let started = false;

    const reveal = () => {
      if (started) return;
      started = true;
      overlay.dataset.state = "out";
      setTimeout(
        () => {
          tv.revealed = true;
          for (const fn of queue.splice(0)) {
            try {
              fn();
            } catch {}
          }
        },
        reduce ? 0 : cfg.contentDelayMs,
      );
      setTimeout(
        () => {
          overlay.dataset.state = "done";
          overlay.hidden = true;
        },
        reduce ? cfg.fadeMs : cfg.outMs,
      );
    };

    const loaded = new Promise<void>((resolve) => {
      if (doc.readyState === "complete") resolve();
      else win.addEventListener("load", () => resolve(), { once: true });
    });
    const parsed = new Promise<void>((resolve) => {
      if (doc.readyState !== "loading") resolve();
      else doc.addEventListener("DOMContentLoaded", () => resolve());
    });
    const images = parsed.then(() =>
      Promise.all(
        Array.from(
          doc.querySelectorAll<HTMLImageElement>("img[data-critical]"),
          (img) => img.decode().catch(() => {}),
        ),
      ),
    );
    Promise.all([loaded, images, doc.fonts ? doc.fonts.ready : null]).then(
      () => {
        const wait = cfg.minMs - (performance.now() - shownAt);
        setTimeout(reveal, Math.max(0, wait));
      },
    );
    setTimeout(reveal, Math.max(0, cfg.maxMs - performance.now()));
  };
}

/** The whole <head> script, as inlined into every page. */
export const BOOT_SCRIPT = `(${tvBoot.toString()})(${lzDecodeUri.toString()},${pickColor.toString()},${JSON.stringify(BOOT_CONFIG)})`;

/** The overlay's own script, placed right after it. */
export const MOUNT_SCRIPT = "window.__tv&&__tv.mount()";
