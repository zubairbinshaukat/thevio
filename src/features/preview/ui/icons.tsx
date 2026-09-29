// Icons for preview components (Lucide paths, ISC licence). Kept apart from
// components/icons.tsx so the landing page's bundle never carries them.

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const CheckIcon = (props: IconProps) => (
  <svg aria-hidden="true" {...base} {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg aria-hidden="true" {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const XIcon = (props: IconProps) => (
  <svg aria-hidden="true" {...base} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
