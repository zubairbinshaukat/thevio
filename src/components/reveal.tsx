"use client";

import { useAnimate } from "motion/react-mini";
import { type ComponentProps, useLayoutEffect } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const RISE = "translateY(14px)";

type RevealProps = ComponentProps<"div"> & {
  /** Seconds before the first item starts. */
  delay?: number;
};

/**
 * Staggers its `[data-rise]` children in (or itself, if it has none): when
 * the preloader lifts, or when scrolled into view.
 *
 * The server HTML is always fully visible (no-JS and crawlers see
 * everything, and LCP is recorded at first paint). The start pose is applied
 * after hydration, only while the overlay still covers the page or the group
 * is off-screen; anything a visitor can already see is left alone.
 */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useLayoutEffect(() => {
    const root = scope.current;
    const tv = window.__tv;
    if (!root || !tv) return;
    const onScreen = root.getBoundingClientRect().top < window.innerHeight;
    if (tv.revealed && onScreen) return;

    const found = root.querySelectorAll<HTMLElement>("[data-rise]");
    const items = found.length ? Array.from(found) : [root];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const item of items) {
      item.style.opacity = "0";
      if (!reduce) item.style.transform = RISE;
    }

    let observer: IntersectionObserver | undefined;
    let cancelled = false;
    const play = () => {
      if (cancelled) return;
      animate(
        items,
        reduce
          ? { opacity: [0, 1] }
          : { opacity: [0, 1], transform: [RISE, "translateY(0)"] },
        {
          duration: reduce ? 0.4 : 0.7,
          ease: EASE_OUT_EXPO,
          delay: (i: number) => delay + i * 0.06,
        },
      );
    };
    tv.on(() => {
      if (cancelled) return;
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          play();
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      observer.observe(root);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [animate, scope, delay]);

  return (
    <div ref={scope} {...props}>
      {children}
    </div>
  );
}
