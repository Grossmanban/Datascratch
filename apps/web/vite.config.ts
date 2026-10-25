import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The server address is injected at build/run time via VITE_DS_SERVER_URL;
// the build itself never contacts the server.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Datascratch",
        short_name: "Datascratch",
        description: "Notes with ink that lives in the text",
        theme_color: "#FAF8F4",
        background_color: "#FAF8F4",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the app shell only; heavy lazy editor modules (Mermaid diagrams, layout
        // engines) are cached on first use so the service worker installs quickly.
        globPatterns: [
          "index.html",
          "assets/{index,editor,react,sodium,kdf.worker,katex,workbox-window}*.{js,css}",
          "assets/*.woff2",
          "*.{svg,png}",
          "icons/*.png",
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "ds-assets", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/v1\//],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173 },
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("libsodium")) return "sodium";
          if (id.includes("prosemirror") || id.includes("@tiptap") || id.includes("y-prosemirror")) return "editor";
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          return undefined;
        },
      },
    },
  },
});
