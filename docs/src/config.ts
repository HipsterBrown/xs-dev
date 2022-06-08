export const SITE = {
  title: 'xs-dev Documentation',
  description: 'CLI for automating the setup and usage of Moddable XS tools',
  defaultLanguage: 'en_US',
}

export const OPEN_GRAPH = {
  twitter: 'hipsterbrown',
  github: 'hipsterbrown',
}

export const KNOWN_LANGUAGES = {
  English: 'en',
}

// Uncomment this to add an "Edit this page" button to every page of documentation.
export const GITHUB_EDIT_URL = `https://github.com/hipsterbrown/xs-dev/blob/main/docs/`

// Uncomment this to add an "Join our Community" button to every page of documentation.
// export const COMMUNITY_INVITE_URL = `https://astro.build/chat`;

// Uncomment this to enable site search.
// See "Algolia" section of the README for more information.
// export const ALGOLIA = {
//   indexName: 'XXXXXXXXXX',
//   appId: 'XXXXXXXXXX',
//   apiKey: 'XXXXXXXXXX',
// }

export const SIDEBAR = {
  en: [
    { text: '', header: true },
    { text: 'Features', header: true },
    { text: 'Introduction', link: 'en/introduction' },
    { text: 'Setup', link: 'en/features/setup' },
    { text: 'Updates', link: 'en/features/update' },
    { text: 'Teardown', link: 'en/features/teardown' },
    { text: 'Device Discovery', link: 'en/features/scan' },
    { text: 'Project Creation', link: 'en/features/init' },
    { text: 'SDK Module Management', link: 'en/features/include' },
  ],
}
