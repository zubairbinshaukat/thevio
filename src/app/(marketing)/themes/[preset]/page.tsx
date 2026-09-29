import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";

// Presets are a fixed set; unknown slugs 404. Phase 2 swaps this for the real
// list from core/theme. Cache Components needs at least one entry to build.
const PRESETS = ["shadcn"] as const;

function isPreset(slug: string): slug is (typeof PRESETS)[number] {
  return (PRESETS as readonly string[]).includes(slug);
}

export function generateStaticParams(): { preset: string }[] {
  return PRESETS.map((preset) => ({ preset }));
}

export default async function PresetPage(props: PageProps<"/themes/[preset]">) {
  const { preset } = await props.params;
  if (!isPreset(preset)) notFound();
  return (
    <PageShell eyebrow="Preset" title={preset}>
      <p>Preset pages arrive with the curated preset list.</p>
    </PageShell>
  );
}
