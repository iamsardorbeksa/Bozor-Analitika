import type { AwardTexts, Dict } from './en'

/** French. Plurals: "one|other". */
export const fr: Dict = {
  // ---- common
  'common.others': 'Autres ({n})',
  'common.person': 'Personne {letter}',
  'common.back': 'Retour',

  // ---- units (plural)
  'unit.messages': 'message|messages',
  'unit.times': '{n} fois|{n} fois',
  'unit.daysInARow': 'jour d’affilée|jours d’affilée',

  // ---- card chrome
  'card.footer.made': 'Créé avec {name}',
  'card.footer.cta': 'Créez le vôtre → {url}',

  // ---- intro
  'card.intro.titleYear': 'Votre {year} en messages',
  'card.intro.title': 'Le bilan de votre chat',
  'card.intro.group': '{n} personnes, un seul chat',
  'card.intro.tap': 'Touchez pour commencer',

  // ---- total
  'card.total.label': '{n} messages au total',
  'card.total.kicker': 'Ensemble, vous avez envoyé',
  'card.total.kickerGroup': 'Ce groupe a envoyé',
  'card.total.words': '{n} mot|{n} mots',
  'card.total.days': '{n} jour de discussion|{n} jours de discussion',
  'card.total.perDay': '≈ {n} messages par jour actif',
  'card.total.busiest': 'Jour le plus actif',
  'card.total.busiestCount': '{n} message ce jour-là|{n} messages ce jour-là',

  // ---- who talks more
  'card.who.kicker': 'Qui parle le plus ?',
  'card.who.balanced': 'Parfaitement équilibré, comme toute chose devrait l’être',
  'card.who.more': '{name} parle le plus',
  'card.who.msgs': '{n} msg',
  'card.who.longer': '{name} écrit plus long : {n} mots en moyenne contre {m}.',
  'card.who.groupTitle': '{name} tient les rênes de ce chat',

  // ---- peak hour
  'card.peak.kicker': 'Votre heure de pointe',
  'card.peak.chartLabel': 'Messages par heure de la journée',
  'card.peak.day': 'Jour le plus actif de la semaine',
  'card.peak.vibe.night': 'Oiseaux de nuit certifiés 🦉',
  'card.peak.vibe.morning': 'Lève-tôt, apparemment ☀️',
  'card.peak.vibe.lunch': 'Pros de la pause déj 🥪',
  'card.peak.vibe.afternoon': 'Coup de mou l’aprèm ? Pas ici 💬',
  'card.peak.vibe.evening': 'Le soir, c’est votre heure de gloire 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'Le plus long silence',
  'card.silence.between': 'Du {from} au {to}',
  'card.silence.broke': '{name} a fini par rompre le silence.',
  'card.streak.kicker': 'Plus longue série',
  'card.streak.active': 'Vous avez discuté {n} jours sur {m}',

  // ---- reply speed
  'card.reply.kicker': 'Vitesse de réponse',
  'card.reply.fastest': '{name} répond le plus vite',
  'card.reply.median': 'temps de réponse médian',
  'card.reply.slowest': '{name} prend son temps. Tout vient à point à qui sait attendre.',

  // ---- words
  'card.words.kicker': 'Top des mots',
  'card.words.title': 'Vos mots préférés',
  'card.words.titleGroup': 'Les mots qui vous définissent',

  // ---- emoji
  'card.emoji.kicker': 'L’emoji du chat',
  'card.emoji.used': 'utilisations',

  // ---- laugh
  'card.laugh.kicker': 'Rigolomètre',
  'card.laugh.total': '{n} rires pour 100 messages',
  'card.laugh.most': '{name} rit le plus',
  'card.laugh.rating.club': 'Comedy club 🎤',
  'card.laugh.rating.vibes': 'Que des bonnes vibes ✨',
  'card.laugh.rating.smiles': 'Petits rires discrets 🙂',
  'card.laugh.rating.serious': 'Ici, on ne rigole pas 🧐',

  // ---- awards
  'card.awards.kicker': 'Et la récompense revient à',

  // ---- starter
  'card.starter.kicker': 'Qui écrit en premier ?',
  'card.starter.title': '{name} lance la conversation',
  'card.starter.of': 'sur {n} conversations',
  'card.starter.killer': 'Coupe-conversation : {name}',
  'card.starter.double': 'Le plus de rafales (3+ messages) : {name}',

  // ---- summary
  'card.summary.kicker': 'Le bilan de votre chat',
  'card.summary.titleGroup': 'Notre chat de groupe',
  'card.summary.messages': 'Messages',
  'card.summary.days': 'Jours de discussion',
  'card.summary.peak': 'Heure de pointe',
  'card.summary.streak': 'Meilleure série',
  'card.summary.emoji': 'Emoji n° 1',
  'card.summary.word': 'Mot n° 1',
  'card.summary.fastest': 'Réponse éclair',
  'card.summary.laughs': 'Rires',
  'card.summary.duration': 'Une histoire de {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'Intro',
  'cardTitle.total': 'Total des messages',
  'cardTitle.who': 'Qui parle le plus',
  'cardTitle.peak': 'Heure de pointe',
  'cardTitle.silence': 'Plus long silence et série',
  'cardTitle.reply': 'Vitesse de réponse',
  'cardTitle.words': 'Top des mots',
  'cardTitle.emojis': 'Top des emojis',
  'cardTitle.laugh': 'Rigolomètre',
  'cardTitle.awards': 'Récompenses : {names}',
  'cardTitle.starter': 'Qui écrit en premier',
  'cardTitle.summary': 'Bilan',

  // ---- story viewer
  'story.progress': 'Cartes',
  'story.goTo': 'Aller à la carte {n} : {title}',
  'story.announce': 'Carte {n} sur {total} : {title}',
  'story.close': 'Fermer',
  'story.hideNames': 'Masquer les noms',
  'story.settings': 'Réglages',
  'story.carousel':
    'Votre story Wrapped. Touchez le côté droit ou appuyez sur → pour la carte suivante.',
  'story.prev': 'Carte précédente',
  'story.next': 'Carte suivante',
  'story.recomputing': 'Nouveau calcul…',
  'story.save': 'Enregistrer l’image',
  'story.share': 'Partager',
  'story.saveAll': 'Toutes (ZIP)',
  'story.saving': 'Création de l’image…',
  'story.preparing': 'Préparation…',
  'story.zipping': 'Emballage des cartes…',
  'story.saved': 'Enregistrée dans vos téléchargements',
  'story.savedAll': 'Toutes les cartes enregistrées en ZIP',
  'story.exportError': 'Impossible de créer l’image. Veuillez réessayer.',
  'share.text': 'Le bilan de mon chat 🎁 Créez le vôtre (100 % privé) : {url}',

  // ---- settings
  'settings.title': 'Réglages',
  'settings.hideNamesHelp':
    'Affiche « Personne A / Personne B » au lieu des vrais noms sur toutes les cartes.',
  'settings.language': 'Langue',

  // ---- time range
  'range.label': 'Période',
  'range.all': 'Depuis le début',
  'range.year': 'Dernière année',
  'range.6months': '6 derniers mois',
  'range.30days': '30 derniers jours',

  // ---- date order
  'dates.title': 'Format de date',
  'dates.current': 'Dates lues au format {format}.',
  'dates.dmy': 'jour/mois',
  'dates.mdy': 'mois/jour',
  'dates.guess': '(notre meilleure hypothèse)',
  'dates.wrong': 'Dates bizarres ? Passer en {format}',

  // ---- navigation & theme
  'nav.privacy': 'Confidentialité',
  'nav.faq': 'FAQ',
  'nav.howto': 'Comment exporter',
  'nav.home': 'Accueil',
  'theme.toLight': 'Passer au thème clair',
  'theme.toDark': 'Passer au thème sombre',
  'lang.label': 'Langue',
  'skip.toContent': 'Aller au contenu',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Votre chat, le bilan.',
  'hero.subtitle':
    'Transformez n’importe quel chat en story drôle et colorée : qui écrit en premier, qui disparaît, vos emojis préférés et des récompenses très honnêtes.',
  'hero.cta': 'Créer mon Wrapped',
  'hero.demo': 'Essayer une démo',
  'privacy.badge': 'Votre chat ne quitte jamais votre appareil',
  'privacy.short':
    'Aucun envoi. Aucun serveur. Aucun pistage. Tout se passe dans votre navigateur.',

  // ---- upload
  'upload.title': 'Importez votre chat',
  'upload.tabs': 'Choisissez votre appli',
  'upload.drop': 'Déposez votre fichier ici',
  'upload.dropActive': 'Lâchez-le !',
  'upload.or': 'ou',
  'upload.button': 'Choisir un fichier',
  'upload.buttonPrivacy': 'Reste sur votre appareil',
  'upload.accepts.whatsapp': 'WhatsApp : export .txt ou .zip',
  'upload.accepts.telegram': 'Telegram : export result.json',

  // ---- export steps
  'steps.title': 'Comment exporter',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Ouvrez la discussion',
  'steps.wa.iphone.2': 'Touchez le nom du contact ou du groupe',
  'steps.wa.iphone.3': 'Faites défiler, touchez Exporter la discussion',
  'steps.wa.iphone.4': 'Choisissez Sans médias, enregistrez le fichier',
  'steps.wa.android.1': 'Ouvrez la discussion',
  'steps.wa.android.2': 'Touchez ⋮ (trois points)',
  'steps.wa.android.3': 'Touchez Plus → Exporter la discussion',
  'steps.wa.android.4': 'Choisissez Sans médias, enregistrez le fichier',
  'steps.wa.tip': 'Importez le .zip ou le .txt qu’il contient, les deux marchent.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'L’appli mobile Telegram ne peut pas exporter les discussions. Utilisez Telegram Desktop (Windows, macOS ou Linux).',
  'steps.tg.1': 'Ouvrez la discussion dans Telegram Desktop',
  'steps.tg.2': 'Cliquez sur ⋮ (trois points) → Exporter l’historique de la discussion',
  'steps.tg.3': 'Décochez photos, vidéos et tous les autres médias',
  'steps.tg.4': 'Réglez le format sur « JSON lisible par machine »',
  'steps.tg.5': 'Cliquez sur Exporter, puis importez result.json',
  'steps.tg.tip':
    'Vous avez exporté tout votre compte ? Importez-le aussi : vous pourrez choisir un chat.',

  // ---- demo
  'demo.title': 'Pas de chat sous la main ? Essayez une démo',
  'demo.whatsapp': 'WhatsApp en tête-à-tête',
  'demo.telegram': 'Groupe Telegram',
  'demo.note': 'Exemples de chats entièrement fictifs.',
  'demo.banner': 'Mode démo : chat fictif',

  // ---- features
  'features.private.title': '100 % privé',
  'features.private.text':
    'Votre fichier est lu par votre propre navigateur. Rien n’est jamais envoyé. Ça marche même hors ligne.',
  'features.fast.title': 'Gros chats ? Aucun souci.',
  'features.fast.text':
    'Un demi-million de messages en quelques secondes, sans faire ramer votre téléphone.',
  'features.share.title': 'Pensé pour les stories',
  'features.share.text':
    'Chaque carte est une image 1080×1920, prête pour Instagram, TikTok ou votre chat de groupe.',
  'features.title': 'Pourquoi on l’adore',
  'features.langs.title': 'Parle votre langue',
  'features.langs.text':
    '9 langues, dont l’arabe et le chinois. Les rires et les « merci » sont reconnus dans chacune.',
  'features.groups.title': 'Duos et groupes',
  'features.groups.text': 'Pour les tête-à-tête comme pour les groupes jusqu’à 50 personnes.',
  'features.free.title': 'Gratuit, sans inscription',
  'features.free.text':
    'Pas de compte, pas d’appli à installer. Ajoutez-le à votre écran d’accueil si vous voulez.',

  // ---- "what you'll discover"
  'discover.title': 'Ce que vous allez découvrir',
  'discover.subtitle':
    'L’histoire que votre chat écrit depuis le début, en plus de 12 cartes à faire défiler.',
  'discover.total.title': 'Le grand total',
  'discover.total.text': 'Chaque message, chaque mot, et ce jour où vous n’arrêtiez plus d’écrire.',
  'discover.who.title': 'Qui parle le plus',
  'discover.who.text': 'La répartition exacte, et qui écrit de vraies dissertations.',
  'discover.rush.title': 'Votre heure de pointe',
  'discover.rush.text': 'Oiseaux de nuit ou lève-tôt ? Votre heure et votre jour les plus actifs.',
  'discover.streak.title': 'Votre plus longue série',
  'discover.streak.text': 'Combien de jours d’affilée la conversation est restée vivante.',
  'discover.silence.title': 'Le grand silence',
  'discover.silence.text': 'Votre plus longue pause, et qui a fini par briser la glace.',
  'discover.reply.title': 'Vitesse de réponse',
  'discover.reply.text': 'Qui répond en quelques secondes, et qui vous laisse en vu.',
  'discover.starter.title': 'Qui écrit en premier',
  'discover.starter.text': 'Qui lance les conversations, et qui a toujours le dernier mot.',
  'discover.laugh.title': 'Rigolomètre',
  'discover.laugh.text': 'Chaque « mdr », « ptdr » et 😂 compté. Qui est le meilleur public ?',
  'discover.words.title': 'Top des mots et emojis',
  'discover.words.text': 'Les mots et les emojis qui vous définissent.',

  // ---- awards showcase
  'showcase.title': 'Personne ne repart les mains vides',
  'showcase.subtitle':
    '34 titres rigolos, attribués selon votre vraie façon de discuter. Toujours drôles, jamais méchants.',
  'showcase.example': 'Exemple',

  // ---- use cases
  'uses.title': 'Idéal pour',
  'uses.couples.title': 'Couples',
  'uses.couples.text': 'Une surprise d’anniversaire : votre histoire d’amour, en chiffres.',
  'uses.friends.title': 'Amitiés',
  'uses.friends.text': 'Tranchez une bonne fois pour toutes : qui répond le plus vite ?',
  'uses.family.title': 'Groupes de famille',
  'uses.family.text': 'Découvrez qui envoie le plus de « bonjour » du matin.',
  'uses.teams.title': 'Équipes et communautés',
  'uses.teams.text': 'Un bilan de fin d’année rigolo pour le chat de groupe.',
  'uses.moments.title': 'Grands moments',
  'uses.moments.text':
    'Anniversaires, Nouvel An, remises de diplômes : un post « notre année » tout prêt.',

  // ---- closing call to action
  'cta.title': 'Envie de découvrir votre histoire ?',
  'cta.text': 'Ça prend environ une minute. Votre chat ne quitte jamais votre appareil.',

  // ---- FAQ
  'faq.title': 'Questions',
  'faq.q1': 'C’est vraiment sûr ?',
  'faq.a1':
    'Oui. L’appli tourne entièrement dans votre navigateur, et sa politique de sécurité lui interdit toute connexion réseau : votre chat ne peut physiquement être envoyé nulle part. Pas de compte, pas d’analytics, pas de cookies.',
  'faq.q2': 'Pourquoi certaines stats semblent bizarres ?',
  'faq.a2':
    'Les exports varient selon le téléphone, la langue et la version de l’appli. Si les dates semblent fausses, utilisez l’option « Dates bizarres ? ». Les médias sont comptés d’après les mentions dans l’export, et les temps de réponse ne tiennent compte que des réponses en moins de 12 heures.',
  'faq.q3': 'Quelles langues sont prises en charge ?',
  'faq.a3':
    'Le comptage marche dans toutes les langues. Les listes de mots, les rires et les mentions de médias sont optimisés pour l’anglais, le russe, l’ouzbek, l’espagnol, le turc, le portugais, l’allemand, le français et l’arabe.',
  'faq.q4': 'Quelle taille peut faire mon fichier ?',
  'faq.a4':
    'Les chats de plus de 500 000 messages (50 Mo et plus) passent sans problème sur un téléphone ou un ordinateur récent. Les très vieux téléphones peuvent peiner avec des exports gigantesques.',
  'faq.q5': 'Ça marche avec les groupes ?',
  'faq.a5':
    'Oui, jusqu’à 50 personnes. Les membres les plus actifs sont mis en avant, les autres sont regroupés dans « Autres ».',

  // ---- footer
  'footer.tagline': 'Fait pour s’amuser. Vos chats restent à vous.',
  'footer.noTracking': 'Pas de traceurs, pas de cookies, pas de serveurs.',

  // ---- loading
  'loading.title': 'Lecture de votre chat…',
  'loading.reading': 'Ouverture du fichier',
  'loading.parsing': 'Lecture des messages',
  'loading.computing': 'Calcul des stats',
  'loading.local': 'Tout se passe sur votre appareil.',

  // ---- setup (after parsing)
  'setup.title': 'Tout est prêt !',
  'setup.messages': '{n} message|{n} messages',
  'setup.people': '{n} personne|{n} personnes',
  'setup.range': 'Quelle période ?',
  'setup.generate': 'Générer mon Wrapped',
  'setup.pickChat': 'Votre export contient plusieurs chats. Choisissez-en un :',
  'setup.chatMessages': '{n} message|{n} messages',
  'setup.another': 'Utiliser un autre fichier',
  'setup.andMore': '+{n} autres',

  // ---- errors
  'error.title': 'Hmm, ça n’a pas marché',
  'error.empty': 'Ce fichier est vide. Essayez d’exporter à nouveau le chat.',
  'error.unrecognized':
    'Impossible de reconnaître ce fichier. Importez un export WhatsApp (.txt ou .zip) ou un result.json de Telegram.',
  'error.telegram_html':
    'On dirait un export HTML de Telegram. Exportez à nouveau dans Telegram Desktop avec le format « JSON lisible par machine », puis importez result.json.',
  'error.zip_no_chat':
    'Ce ZIP ne contient aucun fichier de chat. Cherchez _chat.txt (WhatsApp) ou result.json (Telegram).',
  'error.corrupted_json':
    'Ce fichier JSON semble incomplet ou endommagé. Essayez d’exporter à nouveau le chat.',
  'error.corrupted_zip': 'Ce fichier ZIP semble endommagé. Essayez d’exporter à nouveau le chat.',
  'error.no_messages':
    'Aucun message sur cette période. Essayez une période plus longue ou un autre chat.',
  'error.too_large':
    'Ce fichier est trop lourd pour la mémoire de votre appareil. Essayez d’exporter un seul chat sans médias.',
  'error.unknown': 'Un imprévu s’est produit. Réessayez, ou essayez un autre export.',
  'error.retry': 'Essayer un autre fichier',
  'error.reload': 'Recharger la page',

  // ---- privacy page
  'privacyPage.title': 'La confidentialité, en clair',
  'privacyPage.lead':
    'En bref : votre chat ne quitte jamais votre appareil. Voici ce que ça veut dire.',
  'privacyPage.h1': 'Rien n’est envoyé',
  'privacyPage.p1':
    'Quand vous choisissez un fichier, votre navigateur le lit directement. L’analyse se fait dans cette page web, sur votre téléphone ou votre ordinateur. Aucun serveur ne reçoit votre chat, pour la simple raison qu’il n’y a pas de serveur : le site n’est qu’un ensemble de fichiers statiques.',
  'privacyPage.h2': 'Le navigateur y veille',
  'privacyPage.p2':
    "La page est livrée avec une Content Security Policy stricte qui bloque toute requête réseau (connect-src 'none'). Même si quelqu’un le voulait, le code ne pourrait envoyer votre chat nulle part.",
  'privacyPage.h3': 'Aucun pistage',
  'privacyPage.p3':
    'Pas d’analytics, pas de cookies, pas de pubs, ni scripts ni polices tiers. Nous mémorisons seulement votre langue et votre thème dans le stockage local de votre navigateur.',
  'privacyPage.h4': 'Vos images, votre choix',
  'privacyPage.p4':
    'Les images enregistrées sont créées sur votre appareil. Activez « Masquer les noms » avant de partager si vous voulez garder les noms privés. Rien n’est partagé sans vous.',
  'privacyPage.h5': 'Fermer l’onglet efface tout',
  'privacyPage.p5':
    'Votre chat ne vit que dans la mémoire de cet onglet. Fermez ou rechargez la page, et il disparaît.',
}

export const frAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Philosophe de minuit',
    description: '{count} messages entre minuit et 5 h. Les grandes pensées naissent la nuit.',
  },
  'voice-note-villain': {
    title: 'Le Fléau des vocaux',
    description: '{count} messages vocaux. Le podcast sort quand ?',
  },
  'seen-at': {
    title: 'Vu à 14:14',
    description: 'Temps de réponse médian : {duration}. Tout vient à point à qui sait attendre.',
  },
  'speed-demon': {
    title: 'Bolide du clavier',
    description: 'Répond en {duration} (médiane). Les pouces tiennent le coup ?',
  },
  'essay-writer': {
    title: 'Plume de roman',
    description: '{count} mots par message en moyenne. Le tome 2, c’est pour quand ?',
  },
  'hype-machine': {
    title: 'Pile électrique',
    description: '{count} points d’exclamation et emojis. Pure énergie !!!',
  },
  'ghost-mode': {
    title: 'Mode fantôme',
    description: 'A disparu {duration} avant de répondre. Flippant.',
  },
  'conversation-starter': {
    title: 'Le Coup d’envoi',
    description: 'A lancé {pct} des conversations. Le réveil-matin du chat.',
  },
  'topic-killer': {
    title: 'Coupe-conversation',
    description: 'A eu le dernier mot avant un long silence {count} fois. Mic drop.',
  },
  'chief-laughing-officer': {
    title: 'Responsable des rires',
    description: '{count} rires au compteur. Le meilleur public du monde.',
  },
  'sticker-mafia': {
    title: 'La Mafia des stickers',
    description: '{count} stickers dégainés. Les mots, c’est surfait.',
  },
  'question-detective': {
    title: 'Détective du point d’interrogation',
    description: '{count} questions posées. Curiosité : niveau max.',
  },
  'sorry-champion': {
    title: 'Médaille d’or des excuses',
    description: 'A demandé pardon {count} fois. Sûrement même quand ce n’était pas utile.',
  },
  'gratitude-guru': {
    title: 'Gourou de la gratitude',
    description: 'A dit merci {count} fois. Bonnes manières : impeccables.',
  },
  'love-letter': {
    title: 'Lettre d’amour',
    description: 'A dit « je t’aime » {count} fois. Niveau de mignonnerie : critique.',
  },
  'certified-ok': {
    title: 'OK certifié',
    description: 'A dit « ok » {count} fois. Efficacité. Mystère. Ok.',
  },
  'triple-texter': {
    title: 'Rafale de messages',
    description: '3 messages ou plus d’affilée, {count} fois. Pourquoi le dire une seule fois ?',
  },
  'early-bird': {
    title: 'Lève-tôt',
    description: '{count} messages entre 5 h et 9 h. Le café ? Après le chat.',
  },
  'weekend-warrior': {
    title: 'Star du week-end',
    description: '{pct} de ses messages tombent le week-end. Le samedi, c’est son show.',
  },
  'emoji-artist': {
    title: 'Artiste des emojis',
    description: '{count} emojis différents. Raconter en images, tout un art.',
  },
  paparazzi: {
    title: 'Paparazzi',
    description: '{count} photos et vidéos partagées. Pas de photo ? Ça n’a jamais existé.',
  },
  'master-of-brevity': {
    title: 'As de la concision',
    description: 'Seulement {count} mots par message. Pourquoi gaspiller des lettres ?',
  },
  'main-character': {
    title: 'Personnage principal',
    description: 'A envoyé {pct} de tous les messages. Ce chat, c’est son show.',
  },
  'undo-button': {
    title: 'Bouton Annuler',
    description: '{count} messages supprimés. On ne saura jamais…',
  },
  icebreaker: {
    title: 'Brise-glace',
    description: 'A rompu le plus long silence ({duration}). Un acte héroïque.',
  },
  'office-hours-hero': {
    title: 'Star des heures de bureau',
    description: '{count} messages en semaine, de 9 h à 17 h. Le boulot avance, hein ?',
  },
  'walking-dictionary': {
    title: 'Dictionnaire ambulant',
    description: '{count} mots différents. Vocabulaire de compétition.',
  },
  'caps-lock': {
    title: 'FAN DU CAPS LOCK',
    description: '{count} MESSAGES EN MAJUSCULES. ON A COMPRIS.',
  },
  'link-librarian': {
    title: 'Bibliothèque de liens',
    description: '{count} liens partagés. Des devoirs pour tout le monde.',
  },
  'reply-master': {
    title: 'As de la citation',
    description: 'A répondu en citant {count} fois. Le contexte, c’est tout.',
  },
  'forwarding-department': {
    title: 'Service des transferts',
    description: '{count} messages transférés. Le fil d’actu perso du chat.',
  },
  'loyal-regular': {
    title: 'Fidèle au poste',
    description: '{count} messages de présence douce et constante. Le chat ne serait pas le même.',
  },
  'quiet-legend': {
    title: 'Légende discrète',
    description: 'Parle peu, mais chacun de ses {count} messages vaut de l’or.',
  },
  'prime-time': {
    title: 'Star du prime time',
    description: 'Pic d’activité vers {hour} h. Réglez vos montres.',
  },
}
