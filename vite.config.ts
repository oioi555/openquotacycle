import path from "path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [svelte(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Svelte 5 ships server/browser export conditions; vitest + jsdom needs
    // the browser build or component mounting fails with "mount(...) is not
    // available on the server".
    ...(process.env.VITEST ? { conditions: ["browser"] as string[] } : {}),
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "plugins/**/*.test.js"],
    exclude: ["**/node_modules/**", "**/src-tauri/target/**"],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,svelte}", "plugins/**/*.js"],
      exclude: [
        "**/*.d.ts",
        "**/*.css",
        "public/**",
        "scripts/**",
        "src-tauri/**",
        "src-tauri/resources/**",
        "src-tauri/icons/**",
        "plugins/test-helpers.js",
        "src/svelte/main.ts",
        "src/svelte/hooks/use-dark-mode.svelte.ts",
      ],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        perFile: false,
        branches: 90,
        lines: 90,
        functions: 90,
        statements: 90,
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
