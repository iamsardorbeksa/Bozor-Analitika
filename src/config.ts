/**
 * App identity lives here so the name / URL can be changed in one place.
 * Used by the UI, the exported card footers, index.html meta tags and the PWA manifest.
 */
export const APP_CONFIG = {
  name: 'Chat Wrapped',
  shortName: 'Wrapped',
  /** Shown in small print on every card. Keep it short. */
  displayUrl: 'mychatwrapped.vercel.app',
  /** Absolute URL used for Open Graph tags. */
  siteUrl: 'https://mychatwrapped.vercel.app',
  description:
    'Turn your WhatsApp or Telegram chat into a funny, shareable story. 100% private: your chat never leaves your device.',
  /** Shown in the site footer and as the page author. */
  creator: {
    name: 'Sardorbek Saidqosimov',
    // Stored in two parts so the full address never appears as plain text in the page
    // source, which keeps it away from the simplest spam-harvesting bots.
    emailUser: 'sardorbek.saidqosimov66',
    emailDomain: 'gmail.com',
  },
  themeColor: '#5B2EFF',
  backgroundColor: '#0E0B1F',
} as const
