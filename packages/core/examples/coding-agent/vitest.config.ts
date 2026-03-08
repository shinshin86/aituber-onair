import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["./tests/**/*.test.ts"],
    exclude: ["./tests/e2e/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
