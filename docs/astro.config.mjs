import { defineConfig } from 'astro/config'

import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  integrations: [solidJs(), tailwind(), sitemap()],
  site: 'https://hipsterbrown.github.io',
  base: '/xs-dev',
})
