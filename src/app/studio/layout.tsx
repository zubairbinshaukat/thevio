import { NuqsAdapter } from "nuqs/adapters/next/app";

// URL state lives only in the Studio, so only the Studio pays for the adapter.
export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
