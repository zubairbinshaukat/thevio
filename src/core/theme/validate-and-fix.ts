// Messy input → a valid theme that passes contrast, plus a list of every
// change made. Backs POST /api/theme and the Studio's "Fix all".

import { formatOklch } from "../color/convert";
import { fixContrast } from "../contrast/fix";
import { migrate } from "./migrate";
import { MODES, type Mode, type ResolvedTheme, resolveTheme } from "./resolve";
import {
  StrictThemeSchemaV1,
  THEME_VERSION,
  type Theme,
  toColorValue,
} from "./schema";
import type { ColorToken } from "./tokens";

export type SchemaFix = {
  readonly kind: "schema";
  /** Dotted path, e.g. `colors.brand`. */
  readonly path: string;
  readonly action: "dropped" | "clamped" | "trimmed" | "defaulted";
  readonly message: string;
  readonly from: unknown;
  readonly to: unknown;
};

export type ContrastFix = {
  readonly kind: "contrast";
  readonly mode: Mode;
  readonly token: ColorToken;
  readonly from: string;
  readonly to: string;
  /** Worst ratio across the pairs that made it move. */
  readonly before: number;
  readonly after: number;
};

export type Fix = SchemaFix | ContrastFix;

export type Unfixable = {
  readonly mode: Mode;
  readonly fg: ColorToken;
  readonly bg: ColorToken;
  readonly ratio: number;
  readonly min: number;
};

export type ValidateResult =
  | {
      readonly ok: true;
      readonly theme: Theme;
      readonly resolved: ResolvedTheme;
      readonly fixes: readonly Fix[];
      /** Pairs still failing because the tokens involved were locked. */
      readonly unfixable: readonly Unfixable[];
    }
  | { readonly ok: false; readonly error: string };

export type ValidateOptions = {
  /** Fix failing contrast pairs (default true). */
  contrast?: boolean;
  /** Tokens the fixer must not move, in both modes. */
  locked?: readonly ColorToken[];
};

type Container = Record<string | number, unknown>;
type Path = readonly PropertyKey[];

const isRecord = (value: unknown): value is Container =>
  typeof value === "object" && value !== null;

function getAt(root: unknown, path: Path): unknown {
  let node = root;
  for (const key of path) {
    if (!isRecord(node)) return undefined;
    node = node[key as string];
  }
  return node;
}

/** Remove the value at `path`; inside a tuple, remove the whole tuple. */
function dropAt(root: Container, path: Path): Path {
  const arrayAt = path.findIndex((_, i) =>
    Array.isArray(getAt(root, path.slice(0, i + 1))),
  );
  const target = arrayAt >= 0 ? path.slice(0, arrayAt + 1) : path;
  const parent = getAt(root, target.slice(0, -1));
  const key = target[target.length - 1];
  if (isRecord(parent) && key !== undefined) delete parent[key as string];
  return target;
}

function setAt(root: Container, path: Path, value: unknown) {
  const parent = getAt(root, path.slice(0, -1));
  const key = path[path.length - 1];
  if (isRecord(parent) && key !== undefined) parent[key as string] = value;
}

const dotted = (path: Path) => path.map(String).join(".");

// Each pass fixes every issue zod reports; nesting can reveal a few more.
const MAX_REPAIR_PASSES = 20;

function repair(
  raw: unknown,
): { theme: Theme; fixes: SchemaFix[] } | { error: string } {
  const migrated = migrate(raw);
  if (!isRecord(migrated) || Array.isArray(migrated)) {
    return { error: "A theme must be a JSON object." };
  }
  if (migrated.v !== THEME_VERSION) {
    return {
      error: `Unsupported theme version ${JSON.stringify(migrated.v)}; this server reads version ${THEME_VERSION}.`,
    };
  }

  const data = structuredClone(migrated) as Container;
  const pending: {
    path: Path;
    action: SchemaFix["action"];
    message: string;
    from: unknown;
  }[] = [];

  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
    const result = StrictThemeSchemaV1.safeParse(data);
    if (result.success) {
      const fixes = pending.map(({ path, action, message, from }) => ({
        kind: "schema" as const,
        path: dotted(path),
        action,
        message,
        from,
        to: getAt(result.data, path),
      }));
      return { theme: result.data, fixes };
    }

    for (const issue of result.error.issues) {
      const path = issue.path;
      if (issue.code === "unrecognized_keys") {
        for (const key of issue.keys) {
          const keyPath = [...path, key];
          pending.push({
            path: keyPath,
            action: "dropped",
            message: `Unknown field "${key}".`,
            from: getAt(data, keyPath),
          });
          dropAt(data, keyPath);
        }
        continue;
      }

      const from = getAt(data, path);
      const numeric = typeof from === "number" && Number.isFinite(from);
      if (issue.code === "too_big" && numeric) {
        setAt(data, path, Number(issue.maximum));
        pending.push({ path, action: "clamped", message: issue.message, from });
      } else if (issue.code === "too_small" && numeric) {
        setAt(data, path, Number(issue.minimum));
        pending.push({ path, action: "clamped", message: issue.message, from });
      } else if (issue.code === "too_big" && typeof from === "string") {
        setAt(data, path, from.slice(0, Number(issue.maximum)));
        pending.push({ path, action: "trimmed", message: issue.message, from });
      } else {
        const dropped = dropAt(data, path);
        pending.push({
          path: dropped,
          action: "defaulted",
          message: issue.message,
          from: dropped === path ? from : getAt(migrated, dropped),
        });
      }
    }
  }
  return { error: "The theme could not be repaired." };
}

/**
 * Validate any input and return a theme that is valid and, unless disabled,
 * passes every WCAG 2 pair in both modes. Contrast fixes are stored as
 * overrides, so the fixed theme round-trips through a share link.
 */
export function validateAndFix(
  raw: unknown,
  { contrast = true, locked = [] }: ValidateOptions = {},
): ValidateResult {
  const repaired = repair(raw);
  if ("error" in repaired) return { ok: false, error: repaired.error };

  let theme = repaired.theme;
  const fixes: Fix[] = [...repaired.fixes];
  const unfixable: Unfixable[] = [];

  if (contrast) {
    const resolved = resolveTheme(theme);
    const overrides: Theme["overrides"] = { ...theme.overrides };
    for (const mode of MODES) {
      const result = fixContrast(resolved.colors[mode], { locked });
      if (result.fixes.length > 0) overrides[mode] = { ...overrides[mode] };
      for (const fix of result.fixes) {
        const pinned = overrides[mode];
        if (pinned) pinned[fix.token] = toColorValue(fix.to);
        fixes.push({
          kind: "contrast",
          mode,
          token: fix.token,
          from: formatOklch(fix.from),
          to: formatOklch(fix.to),
          before: fix.before,
          after: fix.after,
        });
      }
      for (const { pair, ratio } of result.impossible) {
        unfixable.push({
          mode,
          fg: pair.fg,
          bg: pair.bg,
          ratio,
          min: pair.min,
        });
      }
    }
    theme = { ...theme, overrides };
  }

  return { ok: true, theme, resolved: resolveTheme(theme), fixes, unfixable };
}
