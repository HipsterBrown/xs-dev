import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://xs-dev.js.org',
  integrations: [
    starlight({
      title: 'xs-dev',
      description: 'CLI for automating the setup and usage of Moddable XS tools',
      social: {
        github: 'https://github.com/hipsterbrown/xs-dev',
      },
      editLink: {
        baseUrl: `https://github.com/hipsterbrown/xs-dev/blob/main/docs/`
      },
      sidebar: [
        {
          label: 'Features',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Setup', link: 'features/setup' },
            { label: 'Updates', link: 'features/update' },
            { label: 'Teardown', link: 'features/teardown' },
            { label: 'Env Info', link: 'features/doctor' },
            { label: 'Device Discovery', link: 'features/scan' },
            { label: 'Project Creation', link: 'features/init' },
            { label: 'Build & Run', link: 'features/run' },
            { label: 'SDK Module Management', link: 'features/include' },
          ],
        },
        {
          label: 'Guide',
          autogenerate: { directory: 'guide' },
        },
      ],
    }),
  ],
});
