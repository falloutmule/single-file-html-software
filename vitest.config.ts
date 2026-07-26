import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["{packages,adapters,examples}/**/*.test.ts"],
    passWithNoTests: false
  }
});
