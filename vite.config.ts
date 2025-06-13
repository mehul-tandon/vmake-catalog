import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Get the directory path in a way that works both in ESM and CommonJS
// Handle URL encoding in paths for macOS
const __dirname = path.dirname(
  decodeURIComponent(new URL(import.meta.url).pathname)
);

export default defineConfig({
  plugins: [
    react(),
    // Only include Replit plugins in development and when REPL_ID is present
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-runtime-error-modal")).default(),
          (await import("@replit/vite-plugin-cartographer")).cartographer(),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});
