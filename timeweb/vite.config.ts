import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Решись Авиа — прогноз спроса",
        short_name: "Решись Авиа",
        description: "Прогноз спроса и продаж авиабилетов по девяти сценариям",
        theme_color: "#07111f",
        background_color: "#07111f",
        display: "standalone",
        lang: "ru",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      workbox: {
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === "navigate",
          handler: "NetworkFirst",
          options: { cacheName: "navigation", networkTimeoutSeconds: 5 },
        }],
      },
    }),
  ],
  server: { port: 3000 },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src"), "@contracts": path.resolve(import.meta.dirname, "./contracts") },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
