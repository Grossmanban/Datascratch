import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server and static build of the showcase (index.html → demo/). The package itself is consumed
// from source by apps/web (exports point at src/), so there is no library build step.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", chunkSizeWarningLimit: 2000 },
  server: { port: 5174 },
});
