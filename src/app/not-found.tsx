import { Logo } from "@/components/logo";

// Kept tiny and server-only: the root not-found tree ships inside every
// page's RSC payload, so its weight counts against every route's budget.
export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-24">
      <div className="surface w-full max-w-md rounded-2xl px-6 py-12 text-center shadow-xl">
        <Logo decorative className="mx-auto h-8 w-auto text-brand" />
        <p className="mt-6 text-eyebrow text-muted-foreground">404</p>
        <h1 className="mt-3 text-title">Page not found</h1>
        <a
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-md"
        >
          Back to Thevio
        </a>
      </div>
    </main>
  );
}
