import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@contracts": path.resolve(import.meta.dirname, "./contracts") } },
  test: { include: ["tests/**/*.test.ts"] },
});
