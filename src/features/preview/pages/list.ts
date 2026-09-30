// The preview pages, in Studio order. Ids appear in share links (`?p=`):
// never rename one; add new pages at the end.

export const PREVIEW_PAGES = [
  { id: "landing", label: "Landing" },
  { id: "dashboard", label: "Dashboard" },
  { id: "sign-in", label: "Sign in" },
  { id: "settings", label: "Settings" },
] as const;

export type PreviewPageId = (typeof PREVIEW_PAGES)[number]["id"];
