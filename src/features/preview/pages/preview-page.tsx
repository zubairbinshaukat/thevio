"use client";

import { DashboardPage } from "./dashboard";
import { LandingPage } from "./landing";
import type { PreviewPageId } from "./list";
import { SettingsPage } from "./settings";
import { SignInPage } from "./sign-in";

const PAGES: Record<PreviewPageId, () => React.JSX.Element> = {
  landing: LandingPage,
  dashboard: DashboardPage,
  "sign-in": SignInPage,
  settings: SettingsPage,
};

/** One preview page. Render inside a ThemeScope. */
export function PreviewPage({ id }: { id: PreviewPageId }) {
  const Page = PAGES[id];
  return <Page />;
}
