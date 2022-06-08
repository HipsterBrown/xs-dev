import { defineConfig } from 'astro/config'

import lit from '@astrojs/lit'
import preact from '@astrojs/preact'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  integrations: [preact(), lit(), tailwind(), sitemap()],
  site: 'https://hipsterbrown.github.io',
  base: '/xs-dev',
})
