import { SAMPLES, THEME_IDS, type ThemeId } from "@/config/sample-themes";
import { problem } from "@/core/api/http";
import { registryItem, stripJson } from "@/core/api/registry";
import { validateAndFix } from "@/core/theme/validate-and-fix";
import { toResponse } from "@/lib/api";

// `npx shadcn add https://…/r/grove.json`: the sample themes, all prerendered.
export function generateStaticParams() {
  return THEME_IDS.map((id) => ({ name: `${id}.json` }));
}

const isThemeId = (name: string): name is ThemeId =>
  (THEME_IDS as readonly string[]).includes(name);

export async function GET(
  _request: Request,
  { params }: RouteContext<"/r/[name]">,
): Promise<Response> {
  const name = stripJson((await params).name);
  if (!isThemeId(name)) {
    return toResponse(
      problem(404, `No theme named "${name}".`, {
        themes: THEME_IDS.map((id) => `${id}.json`),
      }),
    );
  }
  // Samples go through the fixer, as they do everywhere else on the site.
  const result = validateAndFix(SAMPLES[name].input);
  if (!result.ok) throw new Error(result.error);
  return toResponse(registryItem(result.theme, name));
}
