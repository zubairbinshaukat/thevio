import { migrate } from "./migrate";
import { THEME_VERSION, type Theme, ThemeSchemaV1 } from "./schema";

/** The theme you get from `{ v: 1 }`: every default filled in. */
export const DEFAULT_THEME: Theme = ThemeSchemaV1.parse({ v: THEME_VERSION });

/** Parse any input (partial, old version, hand-written) into a full theme. */
export function parseTheme(
  raw: unknown,
): ReturnType<typeof ThemeSchemaV1.safeParse> {
  return ThemeSchemaV1.safeParse(migrate(raw));
}
