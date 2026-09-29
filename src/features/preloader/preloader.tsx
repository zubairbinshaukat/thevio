import { MARK } from "@/config/brand";
import { BOOT_SCRIPT, MOUNT_SCRIPT } from "./boot";
import { NOSCRIPT_CSS, PRELOADER_CSS } from "./styles";

/** Goes first in <head>: colour mode, `?t=` colour, and the overlay's CSS. */
export function PreloaderHead() {
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static script built from our own code (boot.ts) */}
      <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static CSS (styles.ts) */}
      <style dangerouslySetInnerHTML={{ __html: PRELOADER_CSS }} />
      <noscript>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static CSS */}
        <style dangerouslySetInnerHTML={{ __html: NOSCRIPT_CSS }} />
      </noscript>
    </>
  );
}

/**
 * Goes first in <body>. Pure CSS + SVG, so it paints before any JS; the
 * boot script decides when it lifts. The script after it starts the wait.
 */
export function Preloader() {
  return (
    <>
      <div id="tv-pre" aria-hidden="true" suppressHydrationWarning>
        <div className="p p2" />
        <div className="p p1" />
        <div className="m">
          <div className="g" />
          <svg aria-hidden="true" viewBox={`0 0 ${MARK.width} ${MARK.height}`}>
            {MARK.paths.map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
          <div className="b" />
        </div>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static one-liner */}
      <script dangerouslySetInnerHTML={{ __html: MOUNT_SCRIPT }} />
    </>
  );
}
