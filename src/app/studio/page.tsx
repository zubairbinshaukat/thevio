import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { Studio, StudioFallback } from "@/features/studio/studio";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "Build a theme and preview it on real pages: landing, dashboard, sign-in and settings. Share it as a link.",
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <h1 className="sr-only">Thevio Studio</h1>
        {/* The editor reads `?t=` on the client; the shell around it is static. */}
        <Suspense fallback={<StudioFallback />}>
          <Studio />
        </Suspense>
      </main>
    </>
  );
}
