// lz-string's decompressFromEncodedURIComponent, rewritten small enough to
// inline in the <head> boot script (the library itself is ~5 KB).
//
// SELF-CONTAINED ON PURPOSE: the boot script inlines this function with
// `.toString()`, so it must not reference anything outside its own body.
// It is tested against the real library in lz-decode.test.ts.

/** Decode an lz-string URI-safe payload; null (or "") when it's malformed. */
export function lzDecodeUri(input: string): string | null {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  const s = input.replace(/ /g, "+");
  if (!s.length) return "";
  let value = alphabet.indexOf(s.charAt(0));
  let position = 32;
  let index = 1;

  // Read `bits` bits, least significant first, 6 bits per input character.
  const read = (bits: number): number => {
    let out = 0;
    for (let power = 1; power !== 1 << bits; power <<= 1) {
      const bit = value & position;
      position >>= 1;
      if (!position) {
        position = 32;
        value = alphabet.indexOf(s.charAt(index++));
      }
      if (bit) out |= power;
    }
    return out;
  };

  const dictionary: string[] = [];
  let dictSize = 4;
  let numBits = 3;
  let enlargeIn = 4;
  let code = read(2);
  if (code === 2) return "";
  if (code > 2) return null;
  let w = String.fromCharCode(read(code ? 16 : 8));
  dictionary[3] = w;
  const result = [w];

  for (;;) {
    if (index > s.length) return "";
    code = read(numBits);
    if (code === 2) return result.join("");
    if (code < 2) {
      dictionary[dictSize++] = String.fromCharCode(read(code ? 16 : 8));
      code = dictSize - 1;
      enlargeIn--;
    }
    if (!enlargeIn) enlargeIn = 1 << numBits++;

    let entry = dictionary[code];
    if (entry === undefined) {
      if (code !== dictSize) return null;
      entry = w + w.charAt(0);
    }
    result.push(entry);
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;
    if (!enlargeIn) enlargeIn = 1 << numBits++;
  }
}
