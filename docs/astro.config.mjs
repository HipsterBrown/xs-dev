import { defineConfig } from 'astro/config'

import lit from '@astrojs/lit'
import react from '@astrojs/react'
import preact from '@astrojs/preact'
import tailwind from '@astrojs/tailwind'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  integrations: [preact(), react(), lit(), tailwind(), sitemap()],
})
