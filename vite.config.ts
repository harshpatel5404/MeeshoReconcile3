import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Conditionally load Replit plugins only in development
async function loadReplitPlugins() {
  if (process.env.NODE_ENV === "production") {
    return [];
  }
  
  try {
    const [runtimeErrorOverlay, cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").then(m => m.default).catch(() => null),
      import("@replit/vite-plugin-cartographer").then(m => m.cartographer).catch(() => null),
      import("@replit/vite-plugin-dev-banner").then(m => m.devBanner).catch(() => null),
    ]);

    const plugins = [];
    if (runtimeErrorOverlay) plugins.push(runtimeErrorOverlay());
    if (cartographer && process.env.REPL_ID) plugins.push(cartographer());
    if (devBanner && process.env.REPL_ID) plugins.push(devBanner());
    
    return plugins;
  } catch {
    return [];
  }
}

export default defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();
  
  return {
    plugins: [
      react(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
