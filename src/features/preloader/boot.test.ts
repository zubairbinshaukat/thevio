import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { encodeTheme } from "@/core/codec/encode";
import { ThemeSchemaV1 } from "@/core/theme/schema";
import { BOOT_CONFIG, BOOT_SCRIPT, pickColor } from "./boot";
import { lzDecodeUri } from "./lz-decode";

const link = (input: object) =>
  `?t=${encodeURIComponent(encodeTheme(ThemeSchemaV1.parse({ v: 1, ...input })))}`;
/** A link built by hand, bypassing the schema. */
const raw = (payload: object) =>
  `?t=1${compressToEncodedURIComponent(JSON.stringify(payload))}`;
const pick = (search: string, supports = () => true) =>
  pickColor(search, lzDecodeUri, BOOT_CONFIG, supports);

describe("pickColor", () => {
  it("reads the brand from a share link", () => {
    expect(pick(link({ colors: { brand: "#0f9d74" } }))).toMatch(
      /^oklch\(0\.6\d* 0\.1\d* 16\d(\.\d+)? ?\)$/,
    );
  });

  it("prefers a pinned light primary over the brand", () => {
    const search = link({
      colors: { brand: "#0f9d74" },
      overrides: { light: { primary: [0.4, 0.1, 30] } },
    });
    expect(pick(search)).toBe("oklch(0.4 0.1 30)");
  });

  it("finds t among other params", () => {
    const search = `?p=dashboard&${link({ colors: { brand: [0.5, 0.2, 300] } }).slice(1)}&x=1`;
    expect(pick(search)).toBe("oklch(0.5 0.2 300)");
  });

  it("returns null for the default theme, so the CSS default applies", () => {
    expect(pick(link({}))).toBeNull();
    expect(pick("")).toBeNull();
  });

  it("rejects anything that isn't a valid colour", () => {
    expect(pick("?t=2abc")).toBeNull(); // unknown codec
    expect(pick("?t=1!!!!")).toBeNull();
    expect(pick("?t=%E0%A4%A")).toBeNull(); // bad escape
    expect(pick(`?t=1${"A".repeat(9000)}`)).toBeNull();
    expect(pick(raw({ v: 1, b: [2, 0.1, 30] }))).toBeNull(); // L out of range
    expect(pick(raw({ v: 1, b: [0.5, "x", 30] }))).toBeNull();
  });

  it("accepts hand-written string colours only when CSS does", () => {
    const search = raw({ v: 1, b: "tomato" });
    expect(pick(search, () => true)).toBe("tomato");
    expect(pick(search, () => false)).toBeNull();
  });
});

describe("BOOT_SCRIPT", () => {
  it("is self-contained JavaScript", () => {
    expect(() => new Function(BOOT_SCRIPT)).not.toThrow();
    expect(BOOT_SCRIPT).not.toMatch(/import|require\(|__vite|__turbopack/);
  });
});
