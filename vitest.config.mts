import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/engine/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    environment: "node",
    // All DB test files share one hosted pooler (15 clients); running files one at a time
    // keeps the race tests from starving each other of connections.
    fileParallelism: false,
    // Engine tests talk to the hosted Supabase database; give network round-trips room.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
