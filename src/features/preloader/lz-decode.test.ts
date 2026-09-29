import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { encodeTheme } from "@/core/codec/encode";
import { ThemeSchemaV1 } from "@/core/theme/schema";
import { lzDecodeUri } from "./lz-decode";

// Deterministic pseudo-random strings, so failures reproduce.
function* samples(count: number) {
  let seed = 42;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };
  const alphabets = [
    '{}[]":,.0123456789abcdefLD',
    "abcdefghijklmnopqrstuvwxyz ",
    "Ωλ€😀汉字",
  ];
  for (let i = 0; i < count; i++) {
    const chars = alphabets[i % alphabets.length] ?? "";
    const length = Math.floor(next() * 400);
    let text = "";
    for (let j = 0; j < length; j++) {
      text += [...chars][Math.floor(next() * [...chars].length)];
    }
    yield text;
  }
}

describe("lzDecodeUri", () => {
  it("round-trips everything lz-string encodes", () => {
    for (const text of samples(300)) {
      expect(lzDecodeUri(compressToEncodedURIComponent(text))).toBe(text);
    }
  });

  it("decodes real share links", () => {
    const theme = ThemeSchemaV1.parse({
      v: 1,
      name: "Grove",
      colors: { brand: "#0f9d74", neutral: { hue: 160, chroma: 0.01 } },
      overrides: { light: { primary: "#0b7a5a" } },
    });
    const encoded = encodeTheme(theme).slice(1);
    const json = JSON.parse(lzDecodeUri(encoded) ?? "null");
    expect(json.n).toBe("Grove");
    expect(json.b).toHaveLength(3);
    expect(json.L6).toHaveLength(3);
  });

  it("treats spaces as plus signs, like lz-string", () => {
    const text = [...samples(300)].find((sample) =>
      compressToEncodedURIComponent(sample).includes("+"),
    );
    if (text === undefined) throw new Error("no sample encodes to a '+'");
    const encoded = compressToEncodedURIComponent(text);
    expect(lzDecodeUri(encoded.replaceAll("+", " "))).toBe(text);
  });

  it("never throws on garbage", () => {
    for (const junk of ["", "!!!!", "zzzz", "$$$$$$$$", "A", "%%%"]) {
      expect(() => lzDecodeUri(junk)).not.toThrow();
    }
  });
});
