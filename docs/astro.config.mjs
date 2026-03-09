import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://xs-dev.js.org',
  integrations: [
    starlight({
      title: 'xs-dev',
      description: 'CLI for automating the setup and usage of Moddable XS tools',
      logo: {
        src: '/src/assets/Chip.svg'
      },
      social: [{
        icon: 'twitter', href: 'https://twitter.com/hipsterbrown', label: 'Twitter'
      },
      { icon: 'mastodon', href: 'https://toot.cafe/@hipsterbrown', label: 'Mastodon' },
      { icon: 'github', href: 'https://github.com/hipsterbrown/xs-dev', label: 'GitHub' },
      { icon: 'blueSky', href: 'https://bsky.app/profile/hipsterbrown.com', label: 'GitHub' },
      ],
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
        {
          label: 'Troubleshooting',
          link: '/troubleshooting',
        }
      ],
    }),
  ],
});
