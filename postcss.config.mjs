import { resolve } from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Keeps the Studio's and the preview's own builds in their regions
    // (see the file). An absolute path: Turbopack resolves plugin names
    // like packages.
    [resolve("scripts/postcss-scope-utilities.mjs")]: {},
  },
};

export default config;
