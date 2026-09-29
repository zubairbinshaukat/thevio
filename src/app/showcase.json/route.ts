import { exportsSlice } from "@/features/landing/data";

// The landing page's export snippets, fetched only when its Export section
// comes near the viewport. Static: built once, served from the CDN.
export function GET(): Response {
  return Response.json(exportsSlice());
}
