import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || "/ai-assistant/",
  plugins: [react()],
  build: {
    // Served by Express on http://10.103.10.33/ai-assistant/
    outDir: path.resolve(rootDir, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/ai-assistant/api": {
        target: "http://localhost:5000",
        rewrite: (p) => p.replace(/^\/ai-assistant/, ""),
      },
    },
  },
});
