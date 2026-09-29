import { notFound } from "next/navigation";

// Presets are a fixed set; unknown slugs 404. Phase 2 fills the list.
export const dynamicParams = false;

export function generateStaticParams(): { preset: string }[] {
  return [];
}

export default async function PresetPage(props: PageProps<"/themes/[preset]">) {
  const { preset } = await props.params;
  if (!preset) notFound();
  return (
    <main>
      <h1>{preset}</h1>
    </main>
  );
}
