import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://popstarlawngames.com",
  output: "static",
  build: {
    assets: "_assets",
  },
});
