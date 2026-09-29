import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Studio",
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioPage() {
  return (
    <PageShell eyebrow="Studio" title="The editor is on its way.">
      <p>
        The engine it runs on is already live: every scale, contrast check,
        share link and export on the home page comes from it.
      </p>
    </PageShell>
  );
}
