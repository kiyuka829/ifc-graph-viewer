import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";

export default defineConfig(({ mode, command, isPreview }) => {
  const browserBackend = mode === "browser";

  return {
    define: {
      "import.meta.env.VITE_API_ENDPOINT": JSON.stringify(
        command === "serve" && !isPreview ? "http://localhost:8000" : "",
      ),
    },
    plugins: [vue(), svgLoader({})],
    // Resolve at build time so Python builds never traverse the WASM worker.
    resolve: {
      alias: {
        "#ifc-source": fileURLToPath(
          new URL(
            browserBackend ? "./src/data/webIfc.ts" : "./src/data/api.ts",
            import.meta.url,
          ),
        ),
      },
    },
    base: command === "serve" && !isPreview ? "/" : browserBackend ? "./" : "/dist/",
  };
});
