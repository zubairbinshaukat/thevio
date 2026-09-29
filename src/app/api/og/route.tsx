import { ImageResponse } from "next/og";
import { BRAND_COLORS, MARK } from "@/config/brand";
import { siteConfig } from "@/config/site";

// The image is a pure function of the URL, so render it once and let the CDN
// keep it. Vercel doesn't cache function responses unless told to. Stay on the
// Node runtime: Cache Components doesn't support edge.
const IMMUTABLE = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "max-age=31536000",
} as const;

export function GET(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        background: BRAND_COLORS.dark,
        color: BRAND_COLORS.paper,
        fontSize: 96,
      }}
    >
      <svg
        aria-hidden
        width={MARK.width / 4}
        height={MARK.height / 4}
        viewBox={`0 0 ${MARK.width} ${MARK.height}`}
        fill={BRAND_COLORS.paper}
      >
        {MARK.paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {siteConfig.name}
    </div>,
    { width: 1200, height: 630, headers: IMMUTABLE },
  );
}
