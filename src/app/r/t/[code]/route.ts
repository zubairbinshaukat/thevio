import { registryForCode } from "@/core/api/registry";
import { encodeTheme } from "@/core/codec/encode";
import { DEFAULT_THEME } from "@/core/theme/defaults";
import { toResponse } from "@/lib/api";

// `npx shadcn add https://…/r/t/<code>.json`. Any code works at request
// time; the default theme is prerendered (Cache Components needs one param).
export function generateStaticParams() {
  return [{ code: `${encodeTheme(DEFAULT_THEME)}.json` }];
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/r/t/[code]">,
): Promise<Response> {
  const { code } = await params;
  return toResponse(registryForCode(code));
}
