import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/examples/"))
            return "visual-effects";
          if (id.includes("/node_modules/three/")) return "three-engine";
        },
      },
    },
  },
});
