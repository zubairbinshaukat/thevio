// Fails when a prerendered route ships more than its budget in perf-budgets.json.
// Next 16 no longer prints bundle sizes, so we read what each route's HTML
// (and its Link header, where fonts are preloaded) actually loads, and gzip it.
// Run after `next build`:  node scripts/check-budgets.ts

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

type Budget = {
  jsKb: number;
  cssKb: number;
  htmlKb: number;
  fontFiles: number;
  fontKb: number;
  forbid: string[];
};

type Config = {
  budgets: Record<string, Budget>;
  routes: { path: string; budget: string }[];
};

const APP_DIR = join(".next", "server", "app");
const STATIC_PREFIX = "/_next/static/";

const config: Config = JSON.parse(readFileSync("perf-budgets.json", "utf8"));

function kb(bytes: number): number {
  return Math.round((bytes / 1024) * 10) / 10;
}

function gzipBytes(buffer: Buffer): number {
  return gzipSync(buffer).length;
}

function routeFile(path: string, ext: string): string {
  return join(APP_DIR, path === "/" ? `index${ext}` : `${path.slice(1)}${ext}`);
}

function attributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of tag.matchAll(/([^\s=<>/]+)(?:="([^"]*)")?/g)) {
    const name = match[1];
    if (name) attrs.set(name.toLowerCase(), match[2] ?? "");
  }
  return attrs;
}

function staticFile(url: string): string {
  const pathname = url.split(/[?#]/)[0] ?? "";
  if (!pathname.startsWith(STATIC_PREFIX)) {
    throw new Error(`Unexpected asset outside ${STATIC_PREFIX}: ${url}`);
  }
  return join(
    ".next",
    "static",
    decodeURIComponent(pathname.slice(STATIC_PREFIX.length)),
  );
}

/** Font preloads that Next sends as an HTTP Link header instead of a tag. */
function linkHeaderFonts(metaPath: string): string[] {
  if (!existsSync(metaPath)) return [];
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const header: unknown = meta?.headers?.link;
  if (typeof header !== "string") return [];
  return header
    .split(/,(?=\s*<)/)
    .filter((entry) => /rel=preload/.test(entry) && /as="?font"?/.test(entry))
    .map((entry) => entry.match(/<([^>]+)>/)?.[1])
    .filter((url): url is string => Boolean(url));
}

type Assets = { js: Set<string>; css: Set<string>; fonts: Set<string> };

function collectAssets(html: string, metaPath: string): Assets {
  const assets: Assets = { js: new Set(), css: new Set(), fonts: new Set() };
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    const attrs = attributes(tag);
    if (tag.startsWith("<script")) {
      const src = attrs.get("src");
      if (src && !attrs.has("nomodule")) assets.js.add(src);
      continue;
    }
    const rel = attrs.get("rel");
    const href = attrs.get("href");
    if (!href) continue;
    if (rel === "stylesheet") assets.css.add(href);
    if (rel === "preload" && attrs.get("as") === "script") assets.js.add(href);
    if (rel === "preload" && attrs.get("as") === "font") assets.fonts.add(href);
  }
  for (const font of linkHeaderFonts(metaPath)) assets.fonts.add(font);
  return assets;
}

type Row = { metric: string; actual: string; limit: string; ok: boolean };

function checkRoute(path: string, budget: Budget): Row[] | null {
  const htmlPath = routeFile(path, ".html");
  if (!existsSync(htmlPath)) return null;

  const html = readFileSync(htmlPath);
  const assets = collectAssets(html.toString("utf8"), routeFile(path, ".meta"));

  let jsBytes = 0;
  const found = new Set<string>();
  for (const url of assets.js) {
    const code = readFileSync(staticFile(url));
    jsBytes += gzipBytes(code);
    const text = code.toString("utf8");
    for (const marker of budget.forbid) {
      if (text.includes(marker)) found.add(marker);
    }
  }

  let cssBytes = 0;
  for (const url of assets.css)
    cssBytes += gzipBytes(readFileSync(staticFile(url)));

  // woff2 is already compressed, so fonts count at their raw size.
  let fontBytes = 0;
  for (const url of assets.fonts)
    fontBytes += readFileSync(staticFile(url)).length;

  const htmlBytes = gzipBytes(html);

  return [
    {
      metric: "JS (gzip)",
      actual: `${kb(jsBytes)} KB`,
      limit: `${budget.jsKb} KB`,
      ok: kb(jsBytes) <= budget.jsKb,
    },
    {
      metric: "CSS (gzip)",
      actual: `${kb(cssBytes)} KB`,
      limit: `${budget.cssKb} KB`,
      ok: kb(cssBytes) <= budget.cssKb,
    },
    {
      metric: "HTML (gzip)",
      actual: `${kb(htmlBytes)} KB`,
      limit: `${budget.htmlKb} KB`,
      ok: kb(htmlBytes) <= budget.htmlKb,
    },
    {
      metric: "Font preloads",
      actual: `${assets.fonts.size}`,
      limit: `${budget.fontFiles}`,
      ok: assets.fonts.size <= budget.fontFiles,
    },
    {
      metric: "Font bytes",
      actual: `${kb(fontBytes)} KB`,
      limit: `${budget.fontKb} KB`,
      ok: kb(fontBytes) <= budget.fontKb,
    },
    {
      metric: "Must stay lazy",
      actual: found.size ? [...found].join(", ") : "none found",
      limit: budget.forbid.length ? budget.forbid.join(", ") : "-",
      ok: found.size === 0,
    },
  ];
}

if (!existsSync(APP_DIR)) {
  console.error("No build output in .next/. Run `pnpm build` first.");
  process.exit(1);
}

let failed = false;

for (const route of config.routes) {
  const budget = config.budgets[route.budget];
  if (!budget) {
    console.error(`${route.path}: unknown budget "${route.budget}"`);
    failed = true;
    continue;
  }

  const rows = checkRoute(route.path, budget);
  if (!rows) {
    console.error(
      `${route.path}: no prerendered HTML. Is the route still static?`,
    );
    failed = true;
    continue;
  }

  const routeOk = rows.every((row) => row.ok);
  failed ||= !routeOk;
  console.log(
    `\n${routeOk ? "PASS" : "FAIL"}  ${route.path}  (${route.budget})`,
  );
  for (const row of rows) {
    const mark = row.ok ? "  ok " : "  !! ";
    console.log(
      `${mark}${row.metric.padEnd(15)}${row.actual.padStart(14)}  / ${row.limit}`,
    );
  }
}

console.log(
  failed ? "\nPerformance budget exceeded." : "\nAll routes within budget.",
);
process.exit(failed ? 1 : 0);
