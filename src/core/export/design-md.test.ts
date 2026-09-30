import { describe, expect, it } from "vitest";
import { oklch } from "../color/convert";
import { importTheme } from "../import/import";
import { DEFAULT_THEME } from "../theme/defaults";
import { resolveTheme } from "../theme/resolve";
import { ThemeSchemaV1 } from "../theme/schema";
import { STYLE_PRESETS, type StylePresetName } from "../theme/style-presets";
import { validateAndFix } from "../theme/validate-and-fix";
import { describeColor, hueName, toDesignMd } from "./design-md";

const withPreset = (preset: StylePresetName) =>
  ThemeSchemaV1.parse({
    v: 1,
    name: `Test ${preset}`,
    colors: { brand: "#0f9d74" },
    components: STYLE_PRESETS[preset],
  });

const frontMatter = (md: string) =>
  /^---\n([\s\S]*?)\n---\n/.exec(md)?.[1] ?? "";

describe("toDesignMd", () => {
  const md = toDesignMd(resolveTheme(DEFAULT_THEME));

  it("matches the golden output", () => {
    expect(md).toMatchSnapshot();
  });

  it("is a DESIGN.md: front matter, then the canonical sections in order", () => {
    const yaml = frontMatter(md);
    expect(yaml).toMatch(/^version: alpha\nname: Untitled\ndescription: /);
    for (const key of [
      "colors",
      "typography",
      "rounded",
      "spacing",
      "components",
    ]) {
      expect(yaml).toMatch(new RegExp(`^${key}:$`, "m"));
    }
    const sections = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(sections.slice(0, 8)).toEqual([
      "Overview",
      "Colors",
      "Typography",
      "Layout",
      "Elevation & Depth",
      "Shapes",
      "Components",
      "Do's and Don'ts",
    ]);
  });

  it("only references tokens it defines", () => {
    const yaml = frontMatter(md);
    const defined = new Set<string>();
    let group = "";
    for (const line of yaml.split("\n")) {
      const top = /^(\w[\w-]*):$/.exec(line);
      if (top?.[1]) group = top[1];
      const key = /^ {2}([\w-]+):/.exec(line);
      if (key?.[1]) defined.add(`${group}.${key[1]}`);
    }
    const refs = [...yaml.matchAll(/"\{([\w.-]+)\}"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(10);
    for (const ref of refs) expect(defined.has(ref ?? ""), ref).toBe(true);
  });

  it("reports measured contrast honestly", () => {
    const rows = md.split("\n").filter((line) => /:1 [✓✗]/.test(line));
    expect(rows.length).toBe(10);
    // Stock shadcn neutral: the ring is under 3:1 on white. Not hidden.
    expect(md).toMatch(/`ring` on `background` \| 2\.\d+:1 ✗/);
    const fixed = validateAndFix(DEFAULT_THEME);
    if (!fixed.ok) throw new Error(fixed.error);
    expect(toDesignMd(fixed.resolved)).not.toContain("✗");
  });

  it("turns each style preset into different, concrete instructions", () => {
    const shadcn = toDesignMd(resolveTheme(withPreset("shadcn")));
    const soft = toDesignMd(resolveTheme(withPreset("soft")));
    const crisp = toDesignMd(resolveTheme(withPreset("crisp")));
    expect(shadcn).toContain("shape `rounded-lg` on every variant");
    expect(soft).toContain("shape `rounded-full` on every variant");
    expect(soft).toContain("bg-tv-soft-bg text-tv-soft-fg");
    expect(soft).toContain("border-0 border-b border-tv-line bg-tv-field");
    expect(soft).toContain(
      '<Card className="border-0 shadow-md ring-1 ring-foreground/5">',
    );
    expect(crisp).toContain("shape `rounded-xs` on every variant");
    expect(crisp).toContain("default `h-8 px-3`");
    expect(crisp).toContain("rounded-none border-0 border-b border-tv-line");
    expect(crisp).toContain("Don't put borders or shadows on cards.");
  });

  it("names colours in words", () => {
    expect(hueName(262.88)).toBe("blue");
    expect(hueName(150)).toBe("green");
    expect(describeColor(oklch(0.5461, 0.2152, 262.88))).toBe("vivid blue");
    expect(describeColor(oklch(0.97, 0, 0))).toBe("near-white");
  });

  it("imports back into Thevio exactly (it carries the share link)", () => {
    const theme = withPreset("crisp");
    const back = importTheme(toDesignMd(resolveTheme(theme)));
    expect(back.ok && back.theme).toEqual(theme);
  });

  it("stays short enough for agents to read in full", () => {
    expect(md.split("\n").length).toBeLessThan(260);
  });
});
