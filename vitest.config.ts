import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["{packages,adapters,examples}/**/*.test.ts"],
    exclude: ["**/node_modules/**", "examples/*/test-results/**", "examples/*/.candidate/**"],
    passWithNoTests: false
  }
});
