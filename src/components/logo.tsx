import type { SVGProps } from "react";
import { MARK } from "@/config/brand";

type LogoProps = SVGProps<SVGSVGElement> & {
  /** Hide from assistive tech, e.g. when the name is written next to it. */
  decorative?: boolean;
};

const paths = MARK.paths.map((d) => <path key={d} d={d} />);
const viewBox = `0 0 ${MARK.width} ${MARK.height}`;

/**
 * Thevio's mark. It takes the text colour, so it's black on light themes and
 * white on dark ones with no extra work. Size it with `className`.
 */
export function Logo({ decorative = false, ...props }: LogoProps) {
  if (decorative) {
    return (
      <svg viewBox={viewBox} fill="currentColor" aria-hidden="true" {...props}>
        {paths}
      </svg>
    );
  }
  return (
    <svg
      viewBox={viewBox}
      fill="currentColor"
      role="img"
      aria-label="Thevio"
      {...props}
    >
      <title>Thevio</title>
      {paths}
    </svg>
  );
}
