import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Vite 8 resolves tsconfig `paths` (the `@/*` alias) natively.
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        // Pure TS (src/core/** and other *.test.ts): no DOM.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        // React components: jsdom + jest-dom matchers.
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
