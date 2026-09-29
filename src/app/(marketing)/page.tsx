import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <main>
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.description}</p>
    </main>
  );
}
