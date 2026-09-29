import { describe, expect, it } from "vitest";
import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("has the product name", () => {
    expect(siteConfig.name).toBe("Thevio");
  });

  it("has an absolute URL usable as metadataBase", () => {
    expect(() => new URL(siteConfig.url)).not.toThrow();
  });
});
