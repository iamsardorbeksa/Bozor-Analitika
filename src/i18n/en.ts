/**
 * English UI strings (the source of truth for keys).
 * Plurals: "one|other" (Russian uses "one|few|many"). {n} is filled automatically by tp().
 */
export const en = {
  // ---- common
  'common.others': 'Others ({n})',
  'common.person': 'Person {letter}',
  'common.back': 'Back',

  // ---- units (plural)
  'unit.messages': 'message|messages',
  'unit.times': '{n} time|{n} times',
  'unit.daysInARow': 'day in a row|days in a row',

  // ---- card chrome
  'card.footer.made': 'Made with {name}',
  'card.footer.cta': 'Make yours → {url}',

  // ---- intro
  'card.intro.titleYear': 'Your {year} in chat',
  'card.intro.title': 'Your chat, wrapped',
  'card.intro.group': '{n} people, one chat',
  'card.intro.tap': 'Tap to start',

  // ---- total
  'card.total.label': '{n} messages in total',
  'card.total.kicker': 'Together you sent',
  'card.total.kickerGroup': 'This group sent',
  'card.total.words': '{n} word|{n} words',
  'card.total.days': '{n} day of chatting|{n} days of chatting',
  'card.total.perDay': '≈ {n} messages per active day',
  'card.total.busiest': 'Busiest day',
  'card.total.busiestCount': '{n} message that day|{n} messages that day',

  // ---- who talks more
  'card.who.kicker': 'Who talks more?',
  'card.who.balanced': 'Perfectly balanced, as all things should be',
  'card.who.more': '{name} does most of the talking',
  'card.who.msgs': '{n} msgs',
  'card.who.longer': '{name} writes longer messages: {n} words on average vs {m}.',
  'card.who.groupTitle': '{name} runs this chat',

  // ---- peak hour
  'card.peak.kicker': 'Your rush hour',
  'card.peak.chartLabel': 'Messages by hour of the day',
  'card.peak.day': 'Busiest weekday',
  'card.peak.vibe.night': 'Certified night owls 🦉',
  'card.peak.vibe.morning': 'Morning people, apparently ☀️',
  'card.peak.vibe.lunch': 'Lunch-break chatters 🥪',
  'card.peak.vibe.afternoon': 'Afternoon slump? Not here 💬',
  'card.peak.vibe.evening': 'Evening is your prime time 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'The longest silence',
  'card.silence.between': 'From {from} to {to}',
  'card.silence.broke': '{name} finally broke the silence.',
  'card.streak.kicker': 'Longest streak',
  'card.streak.active': 'Chatted on {n} of {m} days',

  // ---- reply speed
  'card.reply.kicker': 'Reply speed',
  'card.reply.fastest': '{name} replies fastest',
  'card.reply.median': 'median reply time',
  'card.reply.slowest': '{name} takes their time. Good things come to those who wait.',

  // ---- words
  'card.words.kicker': 'Top words',
  'card.words.title': 'Your favourite words',
  'card.words.titleGroup': 'The words that defined you',

  // ---- emoji
  'card.emoji.kicker': 'Emoji of the chat',
  'card.emoji.used': 'times used',

  // ---- laugh
  'card.laugh.kicker': 'Laugh-o-meter',
  'card.laugh.total': '{n} laughs per 100 messages',
  'card.laugh.most': '{name} laughs the most',
  'card.laugh.rating.club': 'Comedy club 🎤',
  'card.laugh.rating.vibes': 'Good vibes only ✨',
  'card.laugh.rating.smiles': 'Quietly giggling 🙂',
  'card.laugh.rating.serious': 'Serious business 🧐',

  // ---- awards
  'card.awards.kicker': 'And the award goes to',

  // ---- starter
  'card.starter.kicker': 'Who texts first?',
  'card.starter.title': '{name} starts the conversation',
  'card.starter.of': 'of {n} conversations',
  'card.starter.killer': 'Topic killer: {name}',
  'card.starter.double': 'Most 3-in-a-row texts: {name}',

  // ---- summary
  'card.summary.kicker': 'Your chat, wrapped',
  'card.summary.titleGroup': 'Our group chat',
  'card.summary.messages': 'Messages',
  'card.summary.days': 'Days chatting',
  'card.summary.peak': 'Rush hour',
  'card.summary.streak': 'Best streak',
  'card.summary.emoji': 'Top emoji',
  'card.summary.word': 'Top word',
  'card.summary.fastest': 'Fastest reply',
  'card.summary.laughs': 'Laughs',
  'card.summary.duration': 'A story spanning {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'Intro',
  'cardTitle.total': 'Total messages',
  'cardTitle.who': 'Who talks more',
  'cardTitle.peak': 'Peak hour',
  'cardTitle.silence': 'Longest silence and streak',
  'cardTitle.reply': 'Reply speed',
  'cardTitle.words': 'Top words',
  'cardTitle.emojis': 'Top emojis',
  'cardTitle.laugh': 'Laugh-o-meter',
  'cardTitle.awards': 'Awards: {names}',
  'cardTitle.starter': 'Who texts first',
  'cardTitle.summary': 'Summary',

  // ---- story viewer
  'story.progress': 'Cards',
  'story.goTo': 'Go to card {n}: {title}',
  'story.announce': 'Card {n} of {total}: {title}',
  'story.close': 'Close',
  'story.hideNames': 'Hide names',
  'story.settings': 'Settings',
  'story.carousel': 'Your Wrapped story. Tap the right side or press → for the next card.',
  'story.prev': 'Previous card',
  'story.next': 'Next card',
  'story.recomputing': 'Recalculating…',
  'story.save': 'Save image',
  'story.share': 'Share',
  'story.saveAll': 'All (ZIP)',
  'story.saving': 'Creating image…',
  'story.preparing': 'Preparing…',
  'story.zipping': 'Packing cards…',
  'story.saved': 'Saved to your downloads',
  'story.savedAll': 'All cards saved as ZIP',
  'story.exportError': 'Couldn’t create the image. Please try again.',
  'share.text': 'My chat, wrapped 🎁 Make yours (100% private): {url}',

  // ---- settings
  'settings.title': 'Settings',
  'settings.hideNamesHelp': 'Shows “Person A / Person B” instead of real names on every card.',
  'settings.language': 'Language',

  // ---- time range
  'range.label': 'Time range',
  'range.all': 'All time',
  'range.year': 'Last year',
  'range.6months': 'Last 6 months',
  'range.30days': 'Last 30 days',

  // ---- date order
  'dates.title': 'Date format',
  'dates.current': 'Reading dates as {format}.',
  'dates.dmy': 'day/month',
  'dates.mdy': 'month/day',
  'dates.guess': '(our best guess)',
  'dates.wrong': 'Dates look wrong? Use {format}',

  // ---- navigation & theme
  'nav.privacy': 'Privacy',
  'nav.faq': 'FAQ',
  'nav.howto': 'How to export',
  'nav.home': 'Home',
  'theme.toLight': 'Switch to light theme',
  'theme.toDark': 'Switch to dark theme',
  'lang.label': 'Language',
  'skip.toContent': 'Skip to content',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Your chat, wrapped.',
  'hero.subtitle':
    'Turn any chat into a funny, colourful story: who texts first, who ghosts, your top emojis and some very honest awards.',
  'hero.cta': 'Make my Wrapped',
  'hero.demo': 'Try a demo',
  'privacy.badge': 'Your chat never leaves your device',
  'privacy.short': 'No uploads. No servers. No tracking. Everything runs in your browser.',

  // ---- upload
  'upload.title': 'Upload your chat',
  'upload.tabs': 'Choose your app',
  'upload.drop': 'Drop your chat file here',
  'upload.dropActive': 'Drop it!',
  'upload.or': 'or',
  'upload.button': 'Choose file',
  'upload.buttonPrivacy': 'Stays on your device',
  'upload.accepts.whatsapp': 'WhatsApp: .txt or .zip export',
  'upload.accepts.telegram': 'Telegram: result.json export',

  // ---- export steps
  'steps.title': 'How to export',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Open the chat',
  'steps.wa.iphone.2': 'Tap the contact or group name',
  'steps.wa.iphone.3': 'Scroll down, tap Export Chat',
  'steps.wa.iphone.4': 'Choose Without Media, save the file',
  'steps.wa.android.1': 'Open the chat',
  'steps.wa.android.2': 'Tap ⋮ (three dots)',
  'steps.wa.android.3': 'Tap More → Export chat',
  'steps.wa.android.4': 'Choose Without media, save the file',
  'steps.wa.tip': 'Upload the .zip or the .txt inside it, both work.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'The Telegram phone app can’t export chats. Use Telegram Desktop (Windows, macOS or Linux).',
  'steps.tg.1': 'Open the chat in Telegram Desktop',
  'steps.tg.2': 'Click ⋮ (three dots) → Export chat history',
  'steps.tg.3': 'Uncheck photos, videos and all other media',
  'steps.tg.4': 'Set Format to “Machine-readable JSON”',
  'steps.tg.5': 'Click Export, then upload result.json',
  'steps.tg.tip': 'Exported your whole account? Upload it too: we’ll let you pick a chat.',

  // ---- demo
  'demo.title': 'No chat handy? Try a demo',
  'demo.whatsapp': 'WhatsApp 1-on-1',
  'demo.telegram': 'Telegram group',
  'demo.note': 'Fully fictional sample chats.',
  'demo.banner': 'Demo mode: fictional chat',

  // ---- features
  'features.private.title': '100% private',
  'features.private.text':
    'Your file is read by your own browser. Nothing is uploaded, ever. It even works offline.',
  'features.fast.title': 'Big chats? Fine.',
  'features.fast.text': 'Half a million messages in seconds, without freezing your phone.',
  'features.share.title': 'Made for stories',
  'features.share.text':
    'Every card is a 1080×1920 image, ready for Instagram, TikTok or your group chat.',

  // ---- FAQ
  'faq.title': 'Questions',
  'faq.q1': 'Is it really safe?',
  'faq.a1':
    'Yes. The app runs entirely in your browser, and its security policy forbids it from making any network connections, so your chat physically cannot be sent anywhere. No accounts, no analytics, no cookies.',
  'faq.q2': 'Why do some stats look off?',
  'faq.a2':
    'Exports differ by phone, language and app version. If dates look wrong, use the “Dates look wrong?” switch. Media is counted from the placeholders in the export, and reply times only count replies within 12 hours.',
  'faq.q3': 'Which languages work?',
  'faq.a3':
    'Any language works for counting. Word lists, laughs and media placeholders are tuned for English, Russian, Uzbek, Spanish, Turkish, Portuguese, German, French and Arabic.',
  'faq.q4': 'How big can my file be?',
  'faq.a4':
    'Chats with 500,000+ messages (50 MB+) work fine on a modern phone or laptop. Very old phones may struggle with gigantic exports.',
  'faq.q5': 'Does it work with group chats?',
  'faq.a5':
    'Yes, up to 50 people. The most active members get the spotlight and the rest are grouped as “Others”.',

  // ---- footer
  'footer.tagline': 'Built for fun. Your chats stay yours.',
  'footer.noTracking': 'No trackers, no cookies, no servers.',

  // ---- loading
  'loading.title': 'Reading your chat…',
  'loading.reading': 'Opening the file',
  'loading.parsing': 'Reading messages',
  'loading.computing': 'Crunching the numbers',
  'loading.local': 'All of this happens on your device.',

  // ---- setup (after parsing)
  'setup.title': 'Ready to wrap!',
  'setup.messages': '{n} message|{n} messages',
  'setup.people': '{n} participant|{n} participants',
  'setup.range': 'Which period?',
  'setup.generate': 'Generate my Wrapped',
  'setup.pickChat': 'Your export has several chats. Pick one:',
  'setup.chatMessages': '{n} message|{n} messages',
  'setup.another': 'Use another file',
  'setup.andMore': '+{n} more',

  // ---- errors
  'error.title': 'Hmm, that didn’t work',
  'error.empty': 'This file is empty. Try exporting the chat again.',
  'error.unrecognized':
    'We couldn’t recognise this file. Please upload a WhatsApp export (.txt or .zip) or a Telegram result.json.',
  'error.telegram_html':
    'This looks like a Telegram HTML export. Please export again in Telegram Desktop and set Format to “Machine-readable JSON”, then upload result.json.',
  'error.zip_no_chat':
    'This ZIP doesn’t contain a chat file. Look for _chat.txt (WhatsApp) or result.json (Telegram).',
  'error.corrupted_json':
    'This JSON file seems incomplete or damaged. Try exporting the chat again.',
  'error.corrupted_zip': 'This ZIP file seems damaged. Try exporting the chat again.',
  'error.no_messages':
    'We found no messages in this period. Try a longer time range or another chat.',
  'error.too_large':
    'This file is too big for your device’s memory. Try exporting a single chat without media.',
  'error.unknown': 'Something unexpected happened. Please try again, or try a different export.',
  'error.retry': 'Try another file',
  'error.reload': 'Reload the page',

  // ---- privacy page
  'privacyPage.title': 'Privacy, in plain words',
  'privacyPage.lead': 'Short version: your chat never leaves your device. Here’s what that means.',
  'privacyPage.h1': 'Nothing is uploaded',
  'privacyPage.p1':
    'When you pick a file, your browser reads it directly. The analysis runs inside this web page on your phone or computer. There is no server that receives your chat, because there is no server at all: the site is just static files.',
  'privacyPage.h2': 'The browser enforces it',
  'privacyPage.p2':
    "The page ships with a strict Content Security Policy that blocks every network request (connect-src 'none'). Even if someone wanted to, the code could not send your chat anywhere.",
  'privacyPage.h3': 'No tracking',
  'privacyPage.p3':
    'No analytics, no cookies, no ads, no third-party scripts or fonts. We only remember your language and theme choice in your browser’s local storage.',
  'privacyPage.h4': 'Your images, your choice',
  'privacyPage.p4':
    'Saved images are created on your device. Use “Hide names” before sharing if you want to keep names private. Nothing is shared unless you share it.',
  'privacyPage.h5': 'Closing the tab deletes everything',
  'privacyPage.p5':
    'Your chat lives only in this tab’s memory. Close or reload the page and it’s gone.',
} as const

export type DictKey = keyof typeof en
export type Dict = Record<DictKey, string>

/** Award translations, keyed by award id (English source texts live in src/lib/awards.ts). */
export type AwardTexts = Record<string, { title: string; description: string }>
