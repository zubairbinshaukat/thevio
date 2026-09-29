// The overlay's CSS, inlined in <head> so it paints with the first byte of
// HTML, before any stylesheet or script arrives. See DESIGN.md §4.
//
// - Colour: `--tv-pre` (theme primary; set by the boot script from `?t=`,
//   else this default brand). Lifted in dark mode, capped in light, so any
//   brand stays visible.
// - Curtain: two panels slide down on `transform` only (compositor), with a
//   soft domed leading edge; the tinted one follows 110ms behind.
// - Safety: with no JS, or a failed script, the overlay fades by itself at
//   3.2s. JS sets `data-state`, which hands control to the script.

import { formatOklch } from "@/core/color/convert";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { fromColorValue } from "@/core/theme/schema";

const DEFAULT_PRIMARY = formatOklch(fromColorValue(DEFAULT_THEME.colors.brand));
const EASE_CURTAIN = "cubic-bezier(.76,0,.24,1)";
const EASE_OUT = "cubic-bezier(.16,1,.3,1)";

export const PRELOADER_CSS = `
:root{--tv-pre:${DEFAULT_PRIMARY}}
#tv-pre{--ink:var(--tv-pre);--bg:oklch(.985 .004 262.88);position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;overflow:hidden;animation:tv-cap .5s ease 3.2s forwards}
.dark #tv-pre{--bg:oklch(.15 .008 262.88)}
@supports (color:oklch(from red l c h)){
#tv-pre{--ink:oklch(from var(--tv-pre) min(l,.66) c h);--bg:oklch(from var(--tv-pre) .985 .004 h)}
.dark #tv-pre{--ink:oklch(from var(--tv-pre) max(l,.68) c h);--bg:oklch(from var(--tv-pre) .15 .008 h)}
}
#tv-pre[data-state]{animation:none}
#tv-pre[hidden]{display:none}
#tv-pre .p{position:absolute;inset:-16vh 0 0;border-radius:50% 50% 0 0/16vh 16vh 0 0;transform:translate3d(0,0,0);will-change:transform}
#tv-pre .p2{background:linear-gradient(180deg,color-mix(in oklch,var(--ink) 34%,var(--bg)),color-mix(in oklch,var(--ink) 72%,var(--bg)))}
#tv-pre .p1{background:radial-gradient(60vmax 60vmax at 50% 58%,color-mix(in oklch,var(--ink) 12%,transparent),transparent 62%),var(--bg)}
#tv-pre .m{position:relative;display:grid;justify-items:center;gap:30px;transition:opacity .28s ease,transform .5s ${EASE_OUT}}
#tv-pre .g{position:absolute;top:34px;left:50%;width:280px;height:280px;margin:-140px 0 0 -140px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in oklch,var(--ink) 26%,transparent),transparent);animation:tv-breathe 2.4s ease-in-out .7s infinite alternate}
#tv-pre svg{position:relative;width:76px;height:auto;overflow:visible;fill:var(--ink)}
#tv-pre path{transform-box:fill-box;transform-origin:50% 50%}
#tv-pre path:nth-child(1){animation:tv-bar .85s ${EASE_OUT} both}
#tv-pre path:nth-child(2){animation:tv-leg .85s ${EASE_OUT} .14s both}
#tv-pre path:nth-child(3){animation:tv-leg .85s ${EASE_OUT} .22s both}
#tv-pre .b{position:relative;width:92px;height:3px;overflow:hidden;border-radius:3px;background:color-mix(in oklch,var(--ink) 16%,transparent);animation:tv-fade .4s ease .45s both}
#tv-pre .b::after{content:"";position:absolute;inset:0;width:38%;border-radius:inherit;background:var(--ink);transform:translateX(-100%);animation:tv-run 1.15s cubic-bezier(.65,0,.35,1) infinite}
#tv-pre[data-state=out]{pointer-events:none}
#tv-pre[data-state=out] .m{opacity:0;transform:translateY(14px) scale(.97)}
#tv-pre[data-state=out] .p{transform:translate3d(0,122vh,0);transition:transform .9s ${EASE_CURTAIN}}
#tv-pre[data-state=out] .p2{transition-delay:.11s}
@keyframes tv-cap{to{opacity:0;visibility:hidden}}
@keyframes tv-bar{from{opacity:0;transform:scaleX(.25)}}
@keyframes tv-leg{from{opacity:0;transform:translateY(38%)}}
@keyframes tv-fade{from{opacity:0}}
@keyframes tv-run{to{transform:translateX(265%)}}
@keyframes tv-breathe{from{opacity:.55;transform:scale(.92)}to{opacity:1;transform:scale(1.06)}}
@media (prefers-reduced-motion:reduce){
#tv-pre path,#tv-pre .g,#tv-pre .b,#tv-pre .b::after{animation:none}
#tv-pre .b::after{transform:none}
#tv-pre[data-state=out]{opacity:0;transition:opacity .26s ease}
#tv-pre[data-state=out] .p{transform:none;transition:none}
}`.trim();

/** With JS off, the page is shown straight away. */
export const NOSCRIPT_CSS = "#tv-pre{display:none}";
