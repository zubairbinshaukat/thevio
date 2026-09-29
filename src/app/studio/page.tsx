import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio",
  alternates: {
    canonical: "/studio",
  },
};

export default function StudioPage() {
  return (
    <main>
      <h1>Studio</h1>
    </main>
  );
}
