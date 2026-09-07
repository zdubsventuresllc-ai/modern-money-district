import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
    assetsDir: "assets",
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 8766,
  },
});
