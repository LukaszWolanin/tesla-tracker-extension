// ── Project Configuration ──
// Single source of truth for all configurable values

export const CONFIG = {
  // Author
  author: 'Lukasz Wolanin',
  email: 'lukasz.wolanin1@gmail.com',
  github: 'LukaszWolanin',

  // Repository
  repoUrl: 'https://github.com/LukaszWolanin/tesla-tracker-extension',
  repoClone: 'https://github.com/LukaszWolanin/tesla-tracker-extension.git',
  issuesUrl: 'https://github.com/LukaszWolanin/tesla-tracker-extension/issues',

  // Donate / Sponsor
  githubSponsorsUrl: 'https://github.com/sponsors/LukaszWolanin',
  buyMeCoffeeUrl: 'https://buymeacoffee.com/lukaszwolad',

  // Extension
  extensionName: 'Delivery Tracker for Tesla',
  geckoId: 'tesla-delivery-tracker@wolanin.dev',
} as const;
