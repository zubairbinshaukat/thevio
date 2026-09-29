/**
 * Join class names, skipping falsy ones. For client code on pages with a
 * tight JS budget: `cn` merges conflicting Tailwind classes, but ships a
 * large config to do it. Use `cx` when you control every class.
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
