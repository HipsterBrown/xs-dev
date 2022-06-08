import { defineConfig } from 'astro/config';

import lit from "@astrojs/lit";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), tailwind(), sitemap()]
});
