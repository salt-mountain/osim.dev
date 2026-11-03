import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { inlineDiagrams } from "./src/lib/inline-diagrams";

export default defineConfig({
  output: "static",
  site: "https://osim.dev",
  integrations: [
    inlineDiagrams(),
    sitemap({
      filter: (page) => !page.includes("/pi"),
    }),
  ],
});
