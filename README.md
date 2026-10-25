# Chat Wrapped

Turn a WhatsApp or Telegram chat export into a "Spotify Wrapped"-style story: 10–14 swipeable, screenshot-ready cards with stats and playful awards.

**Privacy model:** everything runs in the browser. There is no backend, no analytics, no cookies, no third-party scripts and no CDN assets. The production page ships a Content-Security-Policy with `connect-src 'none'`, so the browser itself blocks every network request.

The app name, URL and colors live in [`src/config.ts`](src/config.ts). After changing them, run `npm run gen:assets` to regenerate the icons, the Open Graph image and the manifest.

## Run locally

Requires Node.js 20+ (developed on Node 24).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. To test the real production build (strict CSP, service worker):

```bash
npm run build
```

```bash
npm run preview
```

## Tests and checks

```bash
npm test
```

```bash
npm run check
```

`npm run check` runs the TypeScript check, ESLint and all Vitest suites:

- `tests/parsers.test.ts`: WhatsApp (Android 12h/24h, iOS, DD/MM vs MM/DD, multi-line, system messages, multilingual media/deleted placeholders, zips) and Telegram (text arrays, service messages, full-account exports, corrupted files)
- `tests/stats.test.ts`: reply time, silence, streaks, conversation starts, emoji counting, laughs, awards
- `tests/perf.test.ts`: 200k messages per platform, with a 5 s budget (about 1.5 s on a laptop)
- `tests/demo.test.ts`, `tests/i18n.test.ts`

Generate big fake chats for manual testing. This writes to `tmp/`, which is git-ignored:

```bash
npm run gen:chat -- 500000
```

## Project layout

```
src/
  config.ts                 app name / URL / colors (one place)
  lib/parse/                WhatsApp + Telegram parsers, platform detection, zip handling
  lib/stats/compute.ts      single-pass stats engine
  lib/stats/phrases.ts      configurable "sorry / thanks / love you / ok" lists
  lib/stats/stopwords.ts    stopwords (en, ru, uz latin+cyrillic, es, tr, pt, de, fr, zh, ar)
  lib/awards.ts             all award definitions (condition, English title + description)
  lib/demo/demoChats.ts     fictional demo chats
  lib/export/               PNG export (html-to-image), share, ZIP (fflate), inlined fonts
  worker/                   Web Worker: parsing + stats off the main thread
  components/cards/         the story cards and their palettes
  components/story/         story viewer (tap / swipe / keys, settings sheet)
  components/landing/       landing page
  i18n/                     dictionaries (en, es, fr, de, pt, ru, uz, zh, ar) incl. award translations, formatting
scripts/                    asset generator, large-chat generator
```

## Deploy for free

The build output is a static folder (`dist/`). Both `netlify.toml` and `vercel.json` are included and also send the CSP as a real HTTP header.

### Option A: Netlify

1. Push this repository to GitHub, GitLab or Bitbucket.
2. Go to https://app.netlify.com, choose **Add new site → Import an existing project**, and pick the repo.
3. Netlify reads `netlify.toml` (build command `npm run build`, publish directory `dist`). Click **Deploy**.
4. Your site is live at `https://<random-name>.netlify.app`. You can rename it in **Site configuration → Change site name**.

You can also skip Git and drag the `dist/` folder onto https://app.netlify.com/drop after running `npm run build`.

### Option B: Vercel

1. Push the repo to GitHub.
2. Go to https://vercel.com/new, import the repo, and keep the detected **Vite** preset. `vercel.json` sets the build command and output directory.
3. Click **Deploy**. Your site is live at `https://<project>.vercel.app`.

### Connect a custom domain later

1. Buy a domain from any registrar (Namecheap, Porkbun, Cloudflare and so on).
2. **Netlify:** go to **Domain management → Add a domain**. Either switch your registrar's nameservers to the ones Netlify shows, or add the DNS records Netlify lists: an `A` record for the apex domain and a `CNAME` for `www` pointing to `<site>.netlify.app`.
3. **Vercel:** go to **Project → Settings → Domains → Add**. Add the records Vercel shows: an `A` record `76.76.21.21` for the apex domain and a `CNAME` `cname.vercel-dns.com` for `www`.
4. HTTPS certificates are issued automatically within minutes.
5. Update `siteUrl` and `displayUrl` in `src/config.ts`, run `npm run gen:assets`, commit and push. The Open Graph tags and the URL printed on every card will then use your domain.

## Notes and limits

- **WhatsApp date order:** detected by scanning every date. When it's ambiguous, the app defaults to DD/MM and shows a "Dates look wrong?" switch.
- **Telegram:** only the Desktop app can export, using the "Machine-readable JSON" format. HTML exports get a friendly explanation.
- **Media:** counted from export placeholders. Android's `<Media omitted>` doesn't say which kind, so voice notes only show up as voice in iOS or Telegram exports.
- **Offline use:** works after the first visit thanks to a small service worker that caches only the app's own files.
