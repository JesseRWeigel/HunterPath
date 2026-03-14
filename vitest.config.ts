import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  oxc: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./client/src/test/setup.ts"],
    include: [
      "client/src/**/*.test.{ts,tsx}",
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      include: [
        "client/src/lib/game/**",
        "client/src/components/**",
        "server/**",
        "shared/**",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/node_modules/**",
        "client/src/components/ui/**",
      ],
    },
  },
});
