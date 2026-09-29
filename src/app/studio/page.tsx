import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { compareData } from "@/features/studio/data";
import { StyleCompare } from "@/features/studio/style-compare";

export const metadata: Metadata = {
  title: "Studio",
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioPage() {
  const data = compareData();
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-12 pb-20 md:pt-16">
        <div className="page">
          <p className="flex items-center gap-2 text-eyebrow">
            <span aria-hidden className="size-1.5 rounded-full bg-brand" />
            Studio preview
          </p>
          <h1 className="mt-4 max-w-2xl text-title">
            One theme. Three styles.
          </h1>
          <p className="mt-4 max-w-2xl text-lead text-muted-foreground">
            The same page under Thevio&apos;s three style presets. Colours,
            radius and type come from the theme; only seven component tokens
            change. All {data.pairsChecked} component contrast pairs pass WCAG
            2. The full editor is next.
          </p>
        </div>
        {/* Wider than the text column: three previews need the room. */}
        <div className="mx-auto mt-10 w-full max-w-352 px-4 md:px-6 lg:px-8">
          <StyleCompare data={data} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
