import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND_COLORS, MARK } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { decodeTheme } from "@/core/codec/decode";
import { resolveTheme } from "@/core/theme/resolve";
import { loadGoogleFont, type OgFont } from "@/features/og/fonts";
import { ogData, ogText, ThemeImage } from "@/features/og/theme-image";

// The image is a pure function of the URL, so render it once and let the CDN
// keep it. Vercel doesn't cache function responses unless told to. Stay on the
// Node runtime: Cache Components doesn't support edge.
const IMMUTABLE = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "max-age=31536000",
} as const;

const SIZE = { width: 1200, height: 630 } as const;

function brandImage(): ImageResponse {
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
    { ...SIZE, headers: IMMUTABLE },
  );
}

/** `?t=<code>`: that theme. No code, or anything going wrong: the brand image. */
export async function GET(request: NextRequest): Promise<Response> {
  const theme = decodeTheme(request.nextUrl.searchParams.get("t"));
  if (!theme) return brandImage();
  try {
    const data = ogData(resolveTheme(theme));
    const text = ogText(data);
    // Fonts are optional: a family Google doesn't have, or a slow fetch,
    // falls back to the built-in font rather than failing the image.
    const loaded = await Promise.all([
      loadGoogleFont(data.fonts.sans, 400, text),
      loadGoogleFont(data.fonts.sans, 500, text),
      loadGoogleFont(data.fonts.heading, 600, text),
    ]);
    const [regular, medium, heading] = loaded;
    const fonts: OgFont[] = [
      ...(regular ? [{ ...regular, name: "Sans" }] : []),
      ...(medium ? [{ ...medium, name: "Sans" }] : []),
      ...(heading ? [{ ...heading, name: "Heading" }] : []),
    ];
    const image = new ImageResponse(<ThemeImage data={data} />, {
      ...SIZE,
      ...(fonts.length > 0 && { fonts }),
      headers: IMMUTABLE,
    });
    // Rendering is lazy: read it here so a Satori error is caught below.
    const png = await image.arrayBuffer();
    return new Response(png, { headers: image.headers });
  } catch {
    return brandImage();
  }
}
