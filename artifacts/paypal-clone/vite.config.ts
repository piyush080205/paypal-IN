import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  root: __dirname,
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT) || 8080,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port: Number(process.env.PORT) || 8080,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});