"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { stripThemeParam } from "@/lib/analytics";

// `beforeSend` is a function, so it can't cross from the server layout;
// this client wrapper owns it.
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => ({ ...event, url: stripThemeParam(event.url) })}
    />
  );
}
