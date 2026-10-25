import type { AwardTexts, Dict } from './en'

/** German. Plurals: "one|other". */
export const de: Dict = {
  // ---- common
  'common.others': 'Andere ({n})',
  'common.person': 'Person {letter}',
  'common.back': 'Zurück',

  // ---- units (plural)
  'unit.messages': 'Nachricht|Nachrichten',
  'unit.times': '{n}-mal|{n}-mal',
  'unit.daysInARow': 'Tag in Folge|Tage in Folge',

  // ---- card chrome
  'card.footer.made': 'Erstellt mit {name}',
  'card.footer.cta': 'Mach deins → {url}',

  // ---- intro
  'card.intro.titleYear': 'Euer {year} im Chat',
  'card.intro.title': 'Euer Chat-Rückblick',
  'card.intro.group': '{n} Leute, ein Chat',
  'card.intro.tap': 'Tippen zum Starten',

  // ---- total
  'card.total.label': '{n} Nachrichten insgesamt',
  'card.total.kicker': 'Zusammen habt ihr gesendet',
  'card.total.kickerGroup': 'Diese Gruppe hat gesendet',
  'card.total.words': '{n} Wort|{n} Wörter',
  'card.total.days': '{n} Chat-Tag|{n} Chat-Tage',
  'card.total.perDay': '≈ {n} Nachrichten pro aktivem Tag',
  'card.total.busiest': 'Aktivster Tag',
  'card.total.busiestCount': '{n} Nachricht an diesem Tag|{n} Nachrichten an diesem Tag',

  // ---- who talks more
  'card.who.kicker': 'Wer redet mehr?',
  'card.who.balanced': 'Perfekt ausbalanciert, wie alle Dinge es sein sollten',
  'card.who.more': '{name} redet am meisten',
  'card.who.msgs': '{n} Nachr.',
  'card.who.longer': '{name} schreibt länger: im Schnitt {n} Wörter statt {m}.',
  'card.who.groupTitle': '{name} schmeißt diesen Chat',

  // ---- peak hour
  'card.peak.kicker': 'Eure Rushhour',
  'card.peak.chartLabel': 'Nachrichten nach Uhrzeit',
  'card.peak.day': 'Aktivster Wochentag',
  'card.peak.vibe.night': 'Zertifizierte Nachteulen 🦉',
  'card.peak.vibe.morning': 'Offenbar Morgenmenschen ☀️',
  'card.peak.vibe.lunch': 'Mittagspausen-Plauderei 🥪',
  'card.peak.vibe.afternoon': 'Nachmittagstief? Nicht hier 💬',
  'card.peak.vibe.evening': 'Abends seid ihr in Topform 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'Die längste Funkstille',
  'card.silence.between': 'Von {from} bis {to}',
  'card.silence.broke': '{name} hat das Schweigen endlich gebrochen.',
  'card.streak.kicker': 'Längste Serie',
  'card.streak.active': 'An {n} von {m} Tagen gechattet',

  // ---- reply speed
  'card.reply.kicker': 'Antworttempo',
  'card.reply.fastest': '{name} antwortet am schnellsten',
  'card.reply.median': 'Median-Antwortzeit',
  'card.reply.slowest': '{name} lässt sich Zeit. Gut Ding will Weile haben.',

  // ---- words
  'card.words.kicker': 'Top-Wörter',
  'card.words.title': 'Eure Lieblingswörter',
  'card.words.titleGroup': 'Die Wörter, die euch ausmachen',

  // ---- emoji
  'card.emoji.kicker': 'Emoji des Chats',
  'card.emoji.used': 'mal benutzt',

  // ---- laugh
  'card.laugh.kicker': 'Lachometer',
  'card.laugh.total': '{n} Lacher pro 100 Nachrichten',
  'card.laugh.most': '{name} lacht am meisten',
  'card.laugh.rating.club': 'Comedy-Club 🎤',
  'card.laugh.rating.vibes': 'Nur gute Vibes ✨',
  'card.laugh.rating.smiles': 'Leises Kichern 🙂',
  'card.laugh.rating.serious': 'Ernste Angelegenheit 🧐',

  // ---- awards
  'card.awards.kicker': 'Und der Preis geht an',

  // ---- starter
  'card.starter.kicker': 'Wer schreibt zuerst?',
  'card.starter.title': '{name} fängt das Gespräch an',
  'card.starter.of': 'von {n} Gesprächen',
  'card.starter.killer': 'Themenkiller: {name}',
  'card.starter.double': 'Meiste 3er-Salven: {name}',

  // ---- summary
  'card.summary.kicker': 'Euer Chat-Rückblick',
  'card.summary.titleGroup': 'Unser Gruppenchat',
  'card.summary.messages': 'Nachrichten',
  'card.summary.days': 'Chat-Tage',
  'card.summary.peak': 'Rushhour',
  'card.summary.streak': 'Beste Serie',
  'card.summary.emoji': 'Top-Emoji',
  'card.summary.word': 'Top-Wort',
  'card.summary.fastest': 'Schnellste Antwort',
  'card.summary.laughs': 'Lacher',
  'card.summary.duration': 'Eine Geschichte über {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'Intro',
  'cardTitle.total': 'Nachrichten gesamt',
  'cardTitle.who': 'Wer redet mehr',
  'cardTitle.peak': 'Rushhour',
  'cardTitle.silence': 'Längste Funkstille und Serie',
  'cardTitle.reply': 'Antworttempo',
  'cardTitle.words': 'Top-Wörter',
  'cardTitle.emojis': 'Top-Emojis',
  'cardTitle.laugh': 'Lachometer',
  'cardTitle.awards': 'Preise: {names}',
  'cardTitle.starter': 'Wer schreibt zuerst',
  'cardTitle.summary': 'Zusammenfassung',

  // ---- story viewer
  'story.progress': 'Karten',
  'story.goTo': 'Zu Karte {n}: {title}',
  'story.announce': 'Karte {n} von {total}: {title}',
  'story.close': 'Schließen',
  'story.hideNames': 'Namen ausblenden',
  'story.settings': 'Einstellungen',
  'story.carousel': 'Deine Wrapped-Story. Tippe rechts oder drücke → für die nächste Karte.',
  'story.prev': 'Vorherige Karte',
  'story.next': 'Nächste Karte',
  'story.recomputing': 'Wird neu berechnet…',
  'story.save': 'Bild speichern',
  'story.share': 'Teilen',
  'story.saveAll': 'Alle (ZIP)',
  'story.saving': 'Bild wird erstellt…',
  'story.preparing': 'Wird vorbereitet…',
  'story.zipping': 'Karten werden gepackt…',
  'story.saved': 'In deinen Downloads gespeichert',
  'story.savedAll': 'Alle Karten als ZIP gespeichert',
  'story.exportError': 'Bild konnte nicht erstellt werden. Versuch es bitte noch mal.',
  'share.text': 'Mein Chat-Rückblick 🎁 Mach deinen eigenen (100 % privat): {url}',

  // ---- settings
  'settings.title': 'Einstellungen',
  'settings.hideNamesHelp': 'Zeigt „Person A / Person B“ statt echter Namen auf jeder Karte.',
  'settings.language': 'Sprache',

  // ---- time range
  'range.label': 'Zeitraum',
  'range.all': 'Gesamter Zeitraum',
  'range.year': 'Letztes Jahr',
  'range.6months': 'Letzte 6 Monate',
  'range.30days': 'Letzte 30 Tage',

  // ---- date order
  'dates.title': 'Datumsformat',
  'dates.current': 'Daten werden als {format} gelesen.',
  'dates.dmy': 'Tag/Monat',
  'dates.mdy': 'Monat/Tag',
  'dates.guess': '(unsere beste Schätzung)',
  'dates.wrong': 'Daten falsch? {format} verwenden',

  // ---- navigation & theme
  'nav.privacy': 'Datenschutz',
  'nav.faq': 'FAQ',
  'nav.howto': 'Export-Anleitung',
  'nav.home': 'Start',
  'theme.toLight': 'Zum hellen Design wechseln',
  'theme.toDark': 'Zum dunklen Design wechseln',
  'lang.label': 'Sprache',
  'skip.toContent': 'Zum Inhalt springen',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Dein Chat-Rückblick.',
  'hero.subtitle':
    'Mach aus jedem Chat eine witzige, bunte Story: Wer schreibt zuerst, wer ghostet, eure Top-Emojis und ein paar sehr ehrliche Preise.',
  'hero.cta': 'Mein Wrapped erstellen',
  'hero.demo': 'Demo ansehen',
  'privacy.badge': 'Dein Chat verlässt nie dein Gerät',
  'privacy.short': 'Kein Upload. Keine Server. Kein Tracking. Alles läuft in deinem Browser.',

  // ---- upload
  'upload.title': 'Lade deinen Chat hoch',
  'upload.tabs': 'Wähle deine App',
  'upload.drop': 'Chat-Datei hier ablegen',
  'upload.dropActive': 'Loslassen!',
  'upload.or': 'oder',
  'upload.button': 'Datei auswählen',
  'upload.buttonPrivacy': 'Bleibt auf deinem Gerät',
  'upload.accepts.whatsapp': 'WhatsApp: .txt- oder .zip-Export',
  'upload.accepts.telegram': 'Telegram: result.json-Export',

  // ---- export steps
  'steps.title': 'So exportierst du',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Öffne den Chat',
  'steps.wa.iphone.2': 'Tippe auf den Kontakt- oder Gruppennamen',
  'steps.wa.iphone.3': 'Scrolle nach unten, tippe auf Chat exportieren',
  'steps.wa.iphone.4': 'Wähle Ohne Medien und speichere die Datei',
  'steps.wa.android.1': 'Öffne den Chat',
  'steps.wa.android.2': 'Tippe auf ⋮ (drei Punkte)',
  'steps.wa.android.3': 'Tippe auf Mehr → Chat exportieren',
  'steps.wa.android.4': 'Wähle Ohne Medien und speichere die Datei',
  'steps.wa.tip': 'Lade die .zip oder die .txt darin hoch, beides klappt.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'Die Telegram-App fürs Handy kann keine Chats exportieren. Nutze Telegram Desktop (Windows, macOS oder Linux).',
  'steps.tg.1': 'Öffne den Chat in Telegram Desktop',
  'steps.tg.2': 'Klicke auf ⋮ (drei Punkte) → Chatverlauf exportieren',
  'steps.tg.3': 'Entferne die Haken bei Fotos, Videos und allen anderen Medien',
  'steps.tg.4': 'Stelle das Format auf „Maschinenlesbares JSON“',
  'steps.tg.5': 'Klicke auf Exportieren und lade dann result.json hoch',
  'steps.tg.tip':
    'Den ganzen Account exportiert? Lade ihn trotzdem hoch: Du kannst einen Chat auswählen.',

  // ---- demo
  'demo.title': 'Kein Chat zur Hand? Teste die Demo',
  'demo.whatsapp': 'WhatsApp zu zweit',
  'demo.telegram': 'Telegram-Gruppe',
  'demo.note': 'Komplett ausgedachte Beispiel-Chats.',
  'demo.banner': 'Demo-Modus: ausgedachter Chat',

  // ---- features
  'features.private.title': '100 % privat',
  'features.private.text':
    'Deine Datei wird von deinem eigenen Browser gelesen. Nichts wird je hochgeladen. Klappt sogar offline.',
  'features.fast.title': 'Riesige Chats? Kein Problem.',
  'features.fast.text': 'Eine halbe Million Nachrichten in Sekunden, ohne dass dein Handy hängt.',
  'features.share.title': 'Gemacht für Storys',
  'features.share.text':
    'Jede Karte ist ein Bild in 1080×1920, bereit für Instagram, TikTok oder euren Gruppenchat.',
  'features.title': 'Warum alle es lieben',
  'features.langs.title': 'Spricht deine Sprache',
  'features.langs.text':
    '9 Sprachen, darunter Arabisch und Chinesisch. Lacher und „Danke“ erkennt es sogar in allen.',
  'features.groups.title': 'Zu zweit oder in der Gruppe',
  'features.groups.text': 'Für Chats zu zweit und Gruppenchats mit bis zu 50 Leuten.',
  'features.free.title': 'Kostenlos, ohne Anmeldung',
  'features.free.text':
    'Kein Account, keine App zum Installieren. Leg es dir auf den Homescreen, wenn du magst.',

  // ---- "what you'll discover"
  'discover.title': 'Was du entdeckst',
  'discover.subtitle':
    'Die Geschichte, die euer Chat die ganze Zeit geschrieben hat, in 12+ Karten zum Durchwischen.',
  'discover.total.title': 'Eure Gesamtbilanz',
  'discover.total.text':
    'Jede Nachricht, jedes Wort und der eine Tag, an dem ihr einfach nicht aufhören konntet.',
  'discover.who.title': 'Wer redet mehr',
  'discover.who.text': 'Die genaue Verteilung, und wer echte Aufsätze schreibt.',
  'discover.rush.title': 'Eure Rushhour',
  'discover.rush.text': 'Nachteulen oder Frühaufsteher? Eure Top-Uhrzeit und euer Top-Wochentag.',
  'discover.streak.title': 'Eure längste Serie',
  'discover.streak.text': 'Wie viele Tage am Stück ihr den Chat am Leben gehalten habt.',
  'discover.silence.title': 'Die große Funkstille',
  'discover.silence.text': 'Eure längste Pause, und wer endlich das Eis gebrochen hat.',
  'discover.reply.title': 'Antworttempo',
  'discover.reply.text': 'Wer in Sekunden antwortet, und wer dich auf „Gelesen“ sitzen lässt.',
  'discover.starter.title': 'Wer schreibt zuerst',
  'discover.starter.text': 'Wer die Gespräche anfängt, und wer immer das letzte Wort hat.',
  'discover.laugh.title': 'Lachometer',
  'discover.laugh.text': 'Jedes „haha“, „hihi“ und 😂 gezählt. Wer ist das beste Publikum?',
  'discover.words.title': 'Top-Wörter & Emojis',
  'discover.words.text': 'Die Wörter und Emojis, die euch ausmachen.',

  // ---- awards showcase
  'showcase.title': 'Niemand geht leer aus',
  'showcase.subtitle':
    '34 witzige Titel, verliehen danach, wie ihr wirklich chattet. Immer lustig, nie gemein.',
  'showcase.example': 'Beispiel',

  // ---- use cases
  'uses.title': 'Perfekt für',
  'uses.couples.title': 'Paare',
  'uses.couples.text': 'Eine Überraschung zum Jahrestag: eure Liebesgeschichte in Zahlen.',
  'uses.friends.title': 'BFFs',
  'uses.friends.text': 'Klärt ein für alle Mal, wer schneller antwortet.',
  'uses.family.title': 'Familiengruppen',
  'uses.family.text': 'Findet heraus, wer die meisten Guten-Morgen-Grüße schickt.',
  'uses.teams.title': 'Teams & Communitys',
  'uses.teams.text': 'Ein witziger Jahresrückblick für euren Gruppenchat.',
  'uses.moments.title': 'Große Momente',
  'uses.moments.text': 'Geburtstage, Silvester, Abschlussfeiern: ein fertiger „Unser Jahr“-Post.',

  // ---- closing call to action
  'cta.title': 'Bereit für deine Story?',
  'cta.text': 'Dauert etwa eine Minute. Dein Chat verlässt nie dein Gerät.',

  // ---- FAQ
  'faq.title': 'Fragen',
  'faq.q1': 'Ist das wirklich sicher?',
  'faq.a1':
    'Ja. Die App läuft komplett in deinem Browser, und ihre Sicherheitsrichtlinie verbietet jede Netzwerkverbindung. Dein Chat kann also physisch nirgendwohin gesendet werden. Keine Accounts, keine Analytics, keine Cookies.',
  'faq.q2': 'Warum wirken manche Statistiken komisch?',
  'faq.a2':
    'Exporte unterscheiden sich je nach Handy, Sprache und App-Version. Wenn die Daten falsch aussehen, nutze den Schalter „Daten falsch?“. Medien werden anhand der Platzhalter im Export gezählt, und bei Antwortzeiten zählen nur Antworten innerhalb von 12 Stunden.',
  'faq.q3': 'Welche Sprachen funktionieren?',
  'faq.a3':
    'Zählen klappt in jeder Sprache. Wortlisten, Lacher und Medien-Platzhalter sind auf Englisch, Russisch, Usbekisch, Spanisch, Türkisch, Portugiesisch, Deutsch, Französisch und Arabisch abgestimmt.',
  'faq.q4': 'Wie groß darf meine Datei sein?',
  'faq.a4':
    'Chats mit über 500.000 Nachrichten (50 MB+) laufen problemlos auf einem aktuellen Handy oder Laptop. Sehr alte Handys können bei riesigen Exporten ins Schwitzen kommen.',
  'faq.q5': 'Funktioniert das mit Gruppenchats?',
  'faq.a5':
    'Ja, mit bis zu 50 Personen. Die aktivsten Mitglieder stehen im Rampenlicht, der Rest landet unter „Andere“.',

  // ---- footer
  'footer.tagline': 'Aus Spaß gebaut. Deine Chats bleiben deine.',
  'footer.noTracking': 'Keine Tracker, keine Cookies, keine Server.',

  // ---- loading
  'loading.title': 'Dein Chat wird gelesen…',
  'loading.reading': 'Datei wird geöffnet',
  'loading.parsing': 'Nachrichten werden gelesen',
  'loading.computing': 'Zahlen werden berechnet',
  'loading.local': 'Das alles passiert auf deinem Gerät.',

  // ---- setup (after parsing)
  'setup.title': 'Alles bereit!',
  'setup.messages': '{n} Nachricht|{n} Nachrichten',
  'setup.people': '{n} Person|{n} Personen',
  'setup.range': 'Welcher Zeitraum?',
  'setup.generate': 'Mein Wrapped erstellen',
  'setup.pickChat': 'Dein Export enthält mehrere Chats. Wähle einen aus:',
  'setup.chatMessages': '{n} Nachricht|{n} Nachrichten',
  'setup.another': 'Andere Datei verwenden',
  'setup.andMore': '+{n} weitere',

  // ---- errors
  'error.title': 'Hm, das hat nicht geklappt',
  'error.empty': 'Diese Datei ist leer. Exportiere den Chat noch mal.',
  'error.unrecognized':
    'Wir konnten diese Datei nicht erkennen. Lade einen WhatsApp-Export (.txt oder .zip) oder eine Telegram-result.json hoch.',
  'error.telegram_html':
    'Das sieht nach einem HTML-Export von Telegram aus. Exportiere noch mal in Telegram Desktop, stelle das Format auf „Maschinenlesbares JSON“ und lade dann result.json hoch.',
  'error.zip_no_chat':
    'Diese ZIP enthält keine Chat-Datei. Such nach _chat.txt (WhatsApp) oder result.json (Telegram).',
  'error.corrupted_json':
    'Diese JSON-Datei scheint unvollständig oder beschädigt. Exportiere den Chat noch mal.',
  'error.corrupted_zip': 'Diese ZIP-Datei scheint beschädigt. Exportiere den Chat noch mal.',
  'error.no_messages':
    'In diesem Zeitraum gibt es keine Nachrichten. Probier einen längeren Zeitraum oder einen anderen Chat.',
  'error.too_large':
    'Diese Datei ist zu groß für den Speicher deines Geräts. Exportiere am besten einen einzelnen Chat ohne Medien.',
  'error.unknown':
    'Etwas Unerwartetes ist passiert. Versuch es noch mal oder nimm einen anderen Export.',
  'error.retry': 'Andere Datei probieren',
  'error.reload': 'Seite neu laden',

  // ---- privacy page
  'privacyPage.title': 'Datenschutz, klar gesagt',
  'privacyPage.lead': 'Kurz gesagt: Dein Chat verlässt nie dein Gerät. Das bedeutet Folgendes.',
  'privacyPage.h1': 'Nichts wird hochgeladen',
  'privacyPage.p1':
    'Wenn du eine Datei auswählst, liest dein Browser sie direkt. Die Analyse läuft in dieser Webseite auf deinem Handy oder Computer. Es gibt keinen Server, der deinen Chat empfängt, denn es gibt überhaupt keinen Server: Die Seite besteht nur aus statischen Dateien.',
  'privacyPage.h2': 'Der Browser sorgt dafür',
  'privacyPage.p2':
    "Die Seite kommt mit einer strengen Content Security Policy, die jede Netzwerkanfrage blockiert (connect-src 'none'). Selbst wenn jemand wollte, könnte der Code deinen Chat nirgendwohin senden.",
  'privacyPage.h3': 'Kein Tracking',
  'privacyPage.p3':
    'Keine Analytics, keine Cookies, keine Werbung, keine Skripte oder Schriften von Drittanbietern. Wir merken uns nur deine Sprache und dein Design im lokalen Speicher deines Browsers.',
  'privacyPage.h4': 'Deine Bilder, deine Entscheidung',
  'privacyPage.p4':
    'Gespeicherte Bilder entstehen auf deinem Gerät. Nutze vor dem Teilen „Namen ausblenden“, wenn die Namen privat bleiben sollen. Nichts wird geteilt, außer du teilst es.',
  'privacyPage.h5': 'Tab schließen löscht alles',
  'privacyPage.p5':
    'Dein Chat lebt nur im Speicher dieses Tabs. Schließ die Seite oder lade sie neu, und er ist weg.',
}

export const deAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Mitternachts-Philosophie',
    description:
      '{count} Nachrichten zwischen Mitternacht und 5 Uhr. Tiefe Gedanken brauchen dunkle Nächte.',
  },
  'voice-note-villain': {
    title: 'Sprachnachrichten-Dauerfeuer',
    description: '{count} Sprachnachrichten. Wann startet der Podcast?',
  },
  'seen-at': {
    title: 'Gesehen um 14:14',
    description: 'Median-Antwortzeit: {duration}. Gut Ding will Weile haben.',
  },
  'speed-demon': {
    title: 'Blitz-Daumen',
    description: 'Antwortet in {duration} (Median). Geht’s den Daumen gut?',
  },
  'essay-writer': {
    title: 'Aufsatz-Profi',
    description: 'Im Schnitt {count} Wörter pro Nachricht. Wann kommt Kapitel zwei?',
  },
  'hype-machine': {
    title: 'Die Hype-Maschine',
    description: '{count} Ausrufezeichen und Emojis. Pure Energie!!!',
  },
  'ghost-mode': {
    title: 'Geistermodus',
    description: 'War mal {duration} lang abgetaucht, bevor die Antwort kam. Gruselig.',
  },
  'conversation-starter': {
    title: 'Die Gesprächszündung',
    description: 'Hat {pct} aller Gespräche angestoßen. Der Wecker des Chats.',
  },
  'topic-killer': {
    title: 'Das letzte Wort',
    description: 'Hatte {count}-mal das letzte Wort vor langer Stille. Mic drop.',
  },
  'chief-laughing-officer': {
    title: 'Chief Laughing Officer',
    description: '{count} Lacher gezählt. Bestes Publikum aller Zeiten.',
  },
  'sticker-mafia': {
    title: 'Die Sticker-Mafia',
    description: '{count} Sticker verschickt. Worte werden überschätzt.',
  },
  'question-detective': {
    title: 'Die Fragezeichen-Spürnase',
    description: '{count} Fragen gestellt. Neugier-Level: maximal.',
  },
  'sorry-champion': {
    title: 'Entschuldigungs-Profi',
    description:
      'Hat sich {count}-mal entschuldigt. Wahrscheinlich auch, wenn’s gar nicht nötig war.',
  },
  'gratitude-guru': {
    title: 'Danke-Guru',
    description: 'Hat {count}-mal Danke gesagt. Manieren: tadellos.',
  },
  'love-letter': {
    title: 'Der Liebesbrief',
    description: 'Hat {count}-mal „hab dich lieb“ gesagt. Kuschelfaktor: kritisch.',
  },
  'certified-ok': {
    title: 'Zertifiziertes OK',
    description: 'Hat {count}-mal „ok“ gesagt. Effizient. Mysteriös. Ok.',
  },
  'triple-texter': {
    title: 'Die Nachrichten-Salve',
    description: '{count}-mal 3+ Nachrichten am Stück. Warum nur einmal sagen?',
  },
  'early-bird': {
    title: 'Der frühe Vogel',
    description: '{count} Nachrichten zwischen 5 und 9 Uhr. Kaffee? Erst mal chatten.',
  },
  'weekend-warrior': {
    title: 'Wochenend-Star',
    description: '{pct} der Nachrichten landen am Wochenende. Samstags im Rampenlicht.',
  },
  'emoji-artist': {
    title: 'Emoji-Kunst',
    description: '{count} verschiedene Emojis benutzt. Erzählen in Bildern, ganz große Kunst.',
  },
  paparazzi: {
    title: 'Paparazzi',
    description: '{count} Fotos und Videos geteilt. Ohne Foto ist es nie passiert.',
  },
  'master-of-brevity': {
    title: 'In der Kürze liegt die Würze',
    description: 'Nur {count} Wörter pro Nachricht. Wozu Buchstaben verschwenden?',
  },
  'main-character': {
    title: 'Die Hauptrolle',
    description: 'Hat {pct} aller Nachrichten geschickt. Dieser Chat ist die eigene Show.',
  },
  'undo-button': {
    title: 'Der Rückgängig-Knopf',
    description: '{count} Nachrichten gelöscht. Wir werden es nie erfahren…',
  },
  icebreaker: {
    title: 'Der Eisbrecher',
    description: 'Hat die längste Stille gebrochen ({duration}). Echtes Heldentum.',
  },
  'office-hours-hero': {
    title: 'Bürozeiten-Star',
    description: '{count} Nachrichten werktags von 9 bis 17 Uhr. Voll am Arbeiten, oder?',
  },
  'walking-dictionary': {
    title: 'Wandelndes Wörterbuch',
    description: '{count} verschiedene Wörter benutzt. Wortschatz-Flex.',
  },
  'caps-lock': {
    title: 'CAPS-LOCK-FAN',
    description: '{count} NACHRICHTEN IN GROSSBUCHSTABEN. SCHON GUT, WIR HÖREN ZU.',
  },
  'link-librarian': {
    title: 'Die Link-Bibliothek',
    description: '{count} Links geteilt. Hausaufgaben für alle.',
  },
  'reply-master': {
    title: 'Zitier-Profi',
    description: 'Hat {count}-mal mit Zitat geantwortet. Kontext ist alles.',
  },
  'forwarding-department': {
    title: 'Abteilung Weiterleitung',
    description: '{count} Nachrichten weitergeleitet. Der persönliche Newsfeed des Chats.',
  },
  'loyal-regular': {
    title: 'Treue Seele',
    description:
      '{count} Nachrichten voll gemütlicher Beständigkeit. Ohne wär der Chat nicht derselbe.',
  },
  'quiet-legend': {
    title: 'Stille Legende',
    description: 'Schreibt selten, aber jede der {count} Nachrichten ist Gold wert.',
  },
  'prime-time': {
    title: 'Primetime-Star',
    description: 'Am aktivsten gegen {hour} Uhr. Stellt eure Uhren danach.',
  },
}
