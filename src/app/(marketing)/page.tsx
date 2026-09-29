import { Logo } from "@/components/logo";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <main>
      <h1 className="flex items-center gap-3">
        <Logo decorative className="size-10" />
        {siteConfig.name}
      </h1>
      <p>{siteConfig.description}</p>
    </main>
  );
}
