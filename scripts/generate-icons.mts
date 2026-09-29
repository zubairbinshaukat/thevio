// Every icon, drawn from the one mark in src/config/brand.ts.
// Run after changing the mark: `pnpm icons`. Outputs are committed.
//
//   src/app/icon.svg         favicon; black on light, white on dark (media query)
//   src/app/favicon.ico      16/32/48 fallback for browsers without SVG icons
//   src/app/apple-icon.png   180, iOS home screen (no transparency allowed)
//   public/icons/*.png       192/512 + maskable 512 for the web manifest
//   branding/logo.svg        the mark alone, currentColor, for design tools
//
// Raster icons can't follow the colour scheme, so they use a dark tile with
// the white mark, which reads on light and dark surfaces alike.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { BRAND_COLORS, MARK } from "../src/config/brand.ts";

const PATHS = MARK.paths.map((d) => `<path d="${d}"/>`).join("");

type Square = {
  /** Mark width as a share of the canvas width. */
  scale: number;
  fill?: string;
  background?: string;
  /** Tile corner radius as a share of the canvas size. */
  radius?: number;
  style?: string;
};

/** The mark centred on a square canvas. */
function squareSvg({ scale, fill, background, radius = 0, style }: Square) {
  const size = MARK.width / scale;
  const x = (size - MARK.width) / 2;
  const y = (size - MARK.height) / 2;
  const n = (value: number) => Number(value.toFixed(2));
  const tile = background
    ? `<rect width="${n(size)}" height="${n(size)}" rx="${n(size * radius)}" fill="${background}"/>`
    : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(size)} ${n(size)}">`,
    "<title>Thevio</title>",
    style ? `<style>${style}</style>` : "",
    tile,
    `<g transform="translate(${n(x)} ${n(y)})"${fill ? ` fill="${fill}"` : ""}>${PATHS}</g>`,
    "</svg>",
  ].join("");
}

function write(path: string, data: string | Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`  ✓ ${path}`);
}

async function png(svg: string, size: number) {
  return sharp(Buffer.from(svg), { density: 600 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** A .ico holding PNG images (supported everywhere since Windows Vista). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

// Favicon: bare mark, recoloured by the browser's colour scheme.
write(
  "src/app/icon.svg",
  squareSvg({
    scale: 0.92,
    style: `path{fill:${BRAND_COLORS.ink}}@media (prefers-color-scheme:dark){path{fill:${BRAND_COLORS.paper}}}`,
  }),
);

// Raster fallbacks: white mark on a dark tile.
const tile = (scale: number, radius: number) =>
  squareSvg({
    scale,
    fill: BRAND_COLORS.paper,
    background: BRAND_COLORS.dark,
    radius,
  });

write(
  "src/app/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        size,
        data: await png(tile(0.78, 0.22), size),
      })),
    ),
  ),
);

// iOS rounds the corners itself and forbids transparency: full square.
write("src/app/apple-icon.png", await png(tile(0.62, 0), 180));
write("public/icons/icon-192.png", await png(tile(0.62, 0), 192));
write("public/icons/icon-512.png", await png(tile(0.62, 0), 512));
// Maskable: launchers may crop to a circle of 80%; keep the mark well inside.
write("public/icons/icon-maskable-512.png", await png(tile(0.5, 0), 512));

write(
  "branding/logo.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK.width} ${MARK.height}" fill="currentColor"><title>Thevio</title>${PATHS}</svg>\n`,
);

// Brand plate: the mark on light and dark, the app tile, a size ladder and
// the colours. For reviewing the mark, not shipped.
const mark = (x: number, y: number, width: number, fill: string) =>
  `<g transform="translate(${x} ${y}) scale(${width / MARK.width})" fill="${fill}">${PATHS}</g>`;
const { ink, paper, light, dark } = BRAND_COLORS;
const ladder = [64, 40, 24, 16]
  .map((size, i) =>
    mark(40 + i * 90, 470 - size * (MARK.height / MARK.width), size, ink),
  )
  .join("");
write(
  "branding/thevio_logo_brand_plate.svg",
  [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560" font-family="Inter, system-ui, sans-serif">`,
    "<title>Thevio brand plate</title>",
    `<rect width="960" height="560" fill="#f4f4f5"/>`,
    `<rect x="20" y="20" width="300" height="300" rx="16" fill="${light}"/>`,
    mark(70, 80, 200, ink),
    `<rect x="340" y="20" width="300" height="300" rx="16" fill="${dark}"/>`,
    mark(390, 80, 200, paper),
    `<rect x="700" y="60" width="220" height="220" rx="48" fill="${dark}"/>`,
    mark(755, 125, 110, paper),
    ladder,
    mark(420, 400, 72, ink),
    `<text x="508" y="458" font-size="48" font-weight="600" letter-spacing="1" fill="${ink}">Thevio</text>`,
    ...[
      ["ink", ink],
      ["paper", paper],
    ].map(
      ([name, hex], i) =>
        `<rect x="${720 + i * 110}" y="400" width="90" height="60" rx="8" fill="${hex}" stroke="#d4d4d8"/><text x="${720 + i * 110}" y="484" font-size="13" fill="${ink}">${name} ${hex}</text>`,
    ),
    "</svg>",
  ].join(""),
);
