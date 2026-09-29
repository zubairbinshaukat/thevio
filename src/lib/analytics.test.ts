import { describe, expect, it } from "vitest";
import { stripThemeParam } from "./analytics";

describe("stripThemeParam", () => {
  it("drops the theme param and keeps the rest", () => {
    expect(
      stripThemeParam("https://thevio.zubyr.dev/studio?t=1abc&p=pricing"),
    ).toBe("https://thevio.zubyr.dev/studio?p=pricing");
  });

  it("leaves no dangling ? when t was the only param", () => {
    expect(stripThemeParam("https://thevio.zubyr.dev/studio?t=1abc")).toBe(
      "https://thevio.zubyr.dev/studio",
    );
  });

  it("returns urls without t unchanged", () => {
    const url = "https://thevio.zubyr.dev/blog?page=2";
    expect(stripThemeParam(url)).toBe(url);
  });

  it("returns unparseable input unchanged", () => {
    expect(stripThemeParam("not a url")).toBe("not a url");
  });
});
