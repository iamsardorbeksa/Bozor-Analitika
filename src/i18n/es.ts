import type { AwardTexts, Dict } from './en'

/** Spanish. Plurals: "one|other". */
export const es: Dict = {
  // ---- common
  'common.others': 'Otros ({n})',
  'common.person': 'Persona {letter}',
  'common.back': 'Volver',

  // ---- units (plural)
  'unit.messages': 'mensaje|mensajes',
  'unit.times': '{n} vez|{n} veces',
  'unit.daysInARow': 'día seguido|días seguidos',

  // ---- card chrome
  'card.footer.made': 'Hecho con {name}',
  'card.footer.cta': 'Haz el tuyo → {url}',

  // ---- intro
  'card.intro.titleYear': 'Tu {year} en el chat',
  'card.intro.title': 'Tu chat, en resumen',
  'card.intro.group': '{n} personas, un chat',
  'card.intro.tap': 'Toca para empezar',

  // ---- total
  'card.total.label': '{n} mensajes en total',
  'card.total.kicker': 'Entre los dos enviaron',
  'card.total.kickerGroup': 'Este grupo envió',
  'card.total.words': '{n} palabra|{n} palabras',
  'card.total.days': '{n} día de charla|{n} días de charla',
  'card.total.perDay': '≈ {n} mensajes por día activo',
  'card.total.busiest': 'El día más movido',
  'card.total.busiestCount': '{n} mensaje ese día|{n} mensajes ese día',

  // ---- who talks more
  'card.who.kicker': '¿Quién habla más?',
  'card.who.balanced': 'Perfectamente equilibrado, como todo debería ser',
  'card.who.more': '{name} lleva la voz cantante',
  'card.who.msgs': '{n} mens.',
  'card.who.longer': '{name} escribe mensajes más largos: {n} palabras de media frente a {m}.',
  'card.who.groupTitle': '{name} manda en este chat',

  // ---- peak hour
  'card.peak.kicker': 'Tu hora punta',
  'card.peak.chartLabel': 'Mensajes por hora del día',
  'card.peak.day': 'El día más activo',
  'card.peak.vibe.night': 'Búhos nocturnos certificados 🦉',
  'card.peak.vibe.morning': 'Gente madrugadora, por lo visto ☀️',
  'card.peak.vibe.lunch': 'Charlas a la hora de comer 🥪',
  'card.peak.vibe.afternoon': '¿Bajón de la tarde? Aquí no 💬',
  'card.peak.vibe.evening': 'La noche es su momento estelar 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'El silencio más largo',
  'card.silence.between': 'Del {from} al {to}',
  'card.silence.broke': '{name} por fin rompió el silencio.',
  'card.streak.kicker': 'La racha más larga',
  'card.streak.active': 'Hablaron {n} de {m} días',

  // ---- reply speed
  'card.reply.kicker': 'Velocidad de respuesta',
  'card.reply.fastest': '{name} responde más rápido',
  'card.reply.median': 'tiempo medio de respuesta',
  'card.reply.slowest': '{name} se toma su tiempo. Lo bueno se hace esperar.',

  // ---- words
  'card.words.kicker': 'Palabras top',
  'card.words.title': 'Las palabras favoritas del chat',
  'card.words.titleGroup': 'Las palabras que los definen',

  // ---- emoji
  'card.emoji.kicker': 'El emoji del chat',
  'card.emoji.used': 'veces usado',

  // ---- laugh
  'card.laugh.kicker': 'Risómetro',
  'card.laugh.total': '{n} risas cada 100 mensajes',
  'card.laugh.most': '{name} es quien más se ríe',
  'card.laugh.rating.club': 'Club de la comedia 🎤',
  'card.laugh.rating.vibes': 'Solo buen rollo ✨',
  'card.laugh.rating.smiles': 'Risitas discretas 🙂',
  'card.laugh.rating.serious': 'Asuntos serios 🧐',

  // ---- awards
  'card.awards.kicker': 'Y el premio es para',

  // ---- starter
  'card.starter.kicker': '¿Quién escribe primero?',
  'card.starter.title': '{name} empieza la conversación',
  'card.starter.of': 'de {n} conversaciones',
  'card.starter.killer': 'Mata-temas: {name}',
  'card.starter.double': 'Más rachas de 3 mensajes: {name}',

  // ---- summary
  'card.summary.kicker': 'Tu chat, en resumen',
  'card.summary.titleGroup': 'Nuestro grupo',
  'card.summary.messages': 'Mensajes',
  'card.summary.days': 'Días de charla',
  'card.summary.peak': 'Hora punta',
  'card.summary.streak': 'Mejor racha',
  'card.summary.emoji': 'Emoji top',
  'card.summary.word': 'Palabra top',
  'card.summary.fastest': 'Respuesta más rápida',
  'card.summary.laughs': 'Risas',
  'card.summary.duration': 'Una historia de {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'Intro',
  'cardTitle.total': 'Mensajes totales',
  'cardTitle.who': 'Quién habla más',
  'cardTitle.peak': 'Hora punta',
  'cardTitle.silence': 'Silencio más largo y racha',
  'cardTitle.reply': 'Velocidad de respuesta',
  'cardTitle.words': 'Palabras top',
  'cardTitle.emojis': 'Emojis top',
  'cardTitle.laugh': 'Risómetro',
  'cardTitle.awards': 'Premios: {names}',
  'cardTitle.starter': 'Quién escribe primero',
  'cardTitle.summary': 'Resumen',

  // ---- story viewer
  'story.progress': 'Tarjetas',
  'story.goTo': 'Ir a la tarjeta {n}: {title}',
  'story.announce': 'Tarjeta {n} de {total}: {title}',
  'story.close': 'Cerrar',
  'story.hideNames': 'Ocultar nombres',
  'story.settings': 'Ajustes',
  'story.carousel':
    'Tu historia Wrapped. Toca el lado derecho o pulsa → para ver la siguiente tarjeta.',
  'story.prev': 'Tarjeta anterior',
  'story.next': 'Tarjeta siguiente',
  'story.recomputing': 'Recalculando…',
  'story.save': 'Guardar imagen',
  'story.share': 'Compartir',
  'story.saveAll': 'Todas (ZIP)',
  'story.saving': 'Creando imagen…',
  'story.preparing': 'Preparando…',
  'story.zipping': 'Empaquetando tarjetas…',
  'story.saved': 'Guardada en tus descargas',
  'story.savedAll': 'Todas las tarjetas guardadas en ZIP',
  'story.exportError': 'No se pudo crear la imagen. Inténtalo de nuevo.',
  'share.text': 'Mi chat, en resumen 🎁 Haz el tuyo (100 % privado): {url}',

  // ---- settings
  'settings.title': 'Ajustes',
  'settings.hideNamesHelp':
    'Muestra «Persona A / Persona B» en lugar de los nombres reales en todas las tarjetas.',
  'settings.language': 'Idioma',

  // ---- time range
  'range.label': 'Periodo',
  'range.all': 'Todo',
  'range.year': 'Último año',
  'range.6months': 'Últimos 6 meses',
  'range.30days': 'Últimos 30 días',

  // ---- date order
  'dates.title': 'Formato de fecha',
  'dates.current': 'Leemos las fechas como {format}.',
  'dates.dmy': 'día/mes',
  'dates.mdy': 'mes/día',
  'dates.guess': '(según nuestra mejor estimación)',
  'dates.wrong': '¿Fechas raras? Usa {format}',

  // ---- navigation & theme
  'nav.privacy': 'Privacidad',
  'nav.faq': 'Preguntas',
  'nav.howto': 'Cómo exportar',
  'nav.home': 'Inicio',
  'theme.toLight': 'Cambiar a tema claro',
  'theme.toDark': 'Cambiar a tema oscuro',
  'lang.label': 'Idioma',
  'skip.toContent': 'Ir al contenido',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Tu chat, en resumen.',
  'hero.subtitle':
    'Convierte cualquier chat en una historia divertida y colorida: quién escribe primero, quién deja en visto, tus emojis top y unos premios muy sinceros.',
  'hero.cta': 'Crear mi Wrapped',
  'hero.demo': 'Probar una demo',
  'privacy.badge': 'Tu chat nunca sale de tu dispositivo',
  'privacy.short': 'Sin subidas. Sin servidores. Sin rastreo. Todo funciona en tu navegador.',

  // ---- upload
  'upload.title': 'Sube tu chat',
  'upload.tabs': 'Elige tu app',
  'upload.drop': 'Suelta aquí el archivo del chat',
  'upload.dropActive': '¡Suéltalo!',
  'upload.or': 'o',
  'upload.button': 'Elegir archivo',
  'upload.buttonPrivacy': 'Se queda en tu dispositivo',
  'upload.accepts.whatsapp': 'WhatsApp: exportación .txt o .zip',
  'upload.accepts.telegram': 'Telegram: exportación result.json',

  // ---- export steps
  'steps.title': 'Cómo exportar',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Abre el chat',
  'steps.wa.iphone.2': 'Toca el nombre del contacto o del grupo',
  'steps.wa.iphone.3': 'Desliza hacia abajo y toca Exportar chat',
  'steps.wa.iphone.4': 'Elige Sin archivos y guarda el archivo',
  'steps.wa.android.1': 'Abre el chat',
  'steps.wa.android.2': 'Toca ⋮ (tres puntos)',
  'steps.wa.android.3': 'Toca Más → Exportar chat',
  'steps.wa.android.4': 'Elige Sin archivos y guarda el archivo',
  'steps.wa.tip': 'Sube el .zip o el .txt que contiene: los dos funcionan.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'La app de Telegram para móvil no exporta chats. Usa Telegram Desktop (Windows, macOS o Linux).',
  'steps.tg.1': 'Abre el chat en Telegram Desktop',
  'steps.tg.2': 'Haz clic en ⋮ (tres puntos) → Exportar historial del chat',
  'steps.tg.3': 'Desmarca fotos, vídeos y el resto de archivos',
  'steps.tg.4': 'En Formato, elige «JSON legible por máquina»',
  'steps.tg.5': 'Haz clic en Exportar y sube result.json',
  'steps.tg.tip': '¿Exportaste toda tu cuenta? Súbela también: te dejaremos elegir un chat.',

  // ---- demo
  'demo.title': '¿No tienes un chat a mano? Prueba una demo',
  'demo.whatsapp': 'WhatsApp entre dos',
  'demo.telegram': 'Grupo de Telegram',
  'demo.note': 'Chats de ejemplo totalmente ficticios.',
  'demo.banner': 'Modo demo: chat ficticio',

  // ---- features
  'features.private.title': '100 % privado',
  'features.private.text':
    'Tu propio navegador lee el archivo. Nunca se sube nada. Hasta funciona sin conexión.',
  'features.fast.title': '¿Chats enormes? Sin problema.',
  'features.fast.text': 'Medio millón de mensajes en segundos, sin que se cuelgue tu móvil.',
  'features.share.title': 'Hecho para historias',
  'features.share.text':
    'Cada tarjeta es una imagen de 1080×1920, lista para Instagram, TikTok o tu grupo.',
  'features.title': '¿Por qué gusta tanto?',
  'features.langs.title': 'Habla tu idioma',
  'features.langs.text':
    '9 idiomas, incluidos el árabe y el chino. Hasta reconoce las risas y los «gracias» en todos.',
  'features.groups.title': 'Dúos y grupos',
  'features.groups.text': 'Funciona con chats entre dos y con grupos de hasta 50 personas.',
  'features.free.title': 'Gratis y sin registro',
  'features.free.text':
    'Sin cuenta ni apps que instalar. Si quieres, añádelo a tu pantalla de inicio.',

  // ---- "what you'll discover"
  'discover.title': 'Lo que vas a descubrir',
  'discover.subtitle':
    'La historia que tu chat lleva tiempo escribiendo, en más de 12 tarjetas para deslizar.',
  'discover.total.title': 'Tu gran total',
  'discover.total.text': 'Cada mensaje, cada palabra y aquel día en que nadie soltó el móvil.',
  'discover.who.title': 'Quién habla más',
  'discover.who.text': 'El reparto exacto, y quién escribe auténticos ensayos.',
  'discover.rush.title': 'Tu hora punta',
  'discover.rush.text': '¿Búhos nocturnos o gente madrugadora? Tu hora y tu día más movidos.',
  'discover.streak.title': 'Tu racha más larga',
  'discover.streak.text': 'Cuántos días seguidos se mantuvo viva la conversación.',
  'discover.silence.title': 'El gran silencio',
  'discover.silence.text': 'La pausa más larga, y quién rompió por fin el hielo.',
  'discover.reply.title': 'Velocidad de respuesta',
  'discover.reply.text': 'Quién responde en segundos y quién te deja en visto.',
  'discover.starter.title': 'Quién escribe primero',
  'discover.starter.text':
    'Quién empieza las conversaciones y quién siempre tiene la última palabra.',
  'discover.laugh.title': 'Risómetro',
  'discover.laugh.text': 'Contamos cada «jaja», «jsjs» y 😂. ¿Quién es el mejor público?',
  'discover.words.title': 'Palabras y emojis top',
  'discover.words.text': 'Las palabras y los emojis que los definen.',

  // ---- awards showcase
  'showcase.title': 'Aquí nadie se queda sin premio',
  'showcase.subtitle':
    '34 títulos divertidos, repartidos según cómo chateas de verdad. Siempre graciosos, nunca crueles.',
  'showcase.example': 'Ejemplo',

  // ---- use cases
  'uses.title': 'Perfecto para',
  'uses.couples.title': 'Parejas',
  'uses.couples.text': 'Una sorpresa de aniversario: su historia de amor, en números.',
  'uses.friends.title': 'Mejores amistades',
  'uses.friends.text': 'Por fin sabrás quién responde más rápido. Sin discusión.',
  'uses.family.title': 'Grupos familiares',
  'uses.family.text': 'Descubre quién manda más «buenos días».',
  'uses.teams.title': 'Equipos y comunidades',
  'uses.teams.text': 'Un resumen de fin de año muy divertido para el grupo.',
  'uses.moments.title': 'Grandes momentos',
  'uses.moments.text': 'Cumpleaños, Año Nuevo, graduaciones: tu post de «nuestro año», ya listo.',

  // ---- closing call to action
  'cta.title': '¿Te animas a ver tu historia?',
  'cta.text': 'Tarda más o menos un minuto. Tu chat nunca sale de tu dispositivo.',

  // ---- FAQ
  'faq.title': 'Preguntas',
  'faq.q1': '¿De verdad es seguro?',
  'faq.a1':
    'Sí. La app funciona entera en tu navegador y su política de seguridad le prohíbe hacer cualquier conexión de red, así que tu chat físicamente no puede enviarse a ningún sitio. Sin cuentas, sin analíticas, sin cookies.',
  'faq.q2': '¿Por qué algunos datos parecen raros?',
  'faq.a2':
    'Las exportaciones cambian según el móvil, el idioma y la versión de la app. Si las fechas se ven mal, usa el interruptor «¿Fechas raras?». Los archivos multimedia se cuentan por los marcadores de la exportación, y los tiempos de respuesta solo cuentan respuestas en menos de 12 horas.',
  'faq.q3': '¿Qué idiomas funcionan?',
  'faq.a3':
    'Cualquier idioma sirve para contar. Las listas de palabras, las risas y los marcadores multimedia están ajustados para inglés, ruso, uzbeko, español, turco, portugués, alemán, francés y árabe.',
  'faq.q4': '¿Qué tamaño puede tener mi archivo?',
  'faq.a4':
    'Los chats de más de 500 000 mensajes (más de 50 MB) funcionan bien en un móvil o portátil actual. Los móviles muy antiguos pueden sufrir con exportaciones gigantes.',
  'faq.q5': '¿Funciona con grupos?',
  'faq.a5':
    'Sí, hasta 50 personas. Los miembros más activos se llevan el protagonismo y el resto se agrupa en «Otros».',

  // ---- footer
  'footer.tagline': 'Hecho por diversión. Tus chats son solo tuyos.',
  'footer.noTracking': 'Sin rastreadores, sin cookies, sin servidores.',

  // ---- loading
  'loading.title': 'Leyendo tu chat…',
  'loading.reading': 'Abriendo el archivo',
  'loading.parsing': 'Leyendo los mensajes',
  'loading.computing': 'Haciendo cuentas',
  'loading.local': 'Todo esto ocurre en tu dispositivo.',

  // ---- setup (after parsing)
  'setup.title': '¡Listo para el resumen!',
  'setup.messages': '{n} mensaje|{n} mensajes',
  'setup.people': '{n} participante|{n} participantes',
  'setup.range': '¿Qué periodo?',
  'setup.generate': 'Generar mi Wrapped',
  'setup.pickChat': 'Tu exportación tiene varios chats. Elige uno:',
  'setup.chatMessages': '{n} mensaje|{n} mensajes',
  'setup.another': 'Usar otro archivo',
  'setup.andMore': '+{n} más',

  // ---- errors
  'error.title': 'Vaya, eso no funcionó',
  'error.empty': 'Este archivo está vacío. Prueba a exportar el chat de nuevo.',
  'error.unrecognized':
    'No reconocemos este archivo. Sube una exportación de WhatsApp (.txt o .zip) o un result.json de Telegram.',
  'error.telegram_html':
    'Parece una exportación HTML de Telegram. Vuelve a exportar en Telegram Desktop con el formato «JSON legible por máquina» y sube result.json.',
  'error.zip_no_chat':
    'Este ZIP no contiene ningún chat. Busca _chat.txt (WhatsApp) o result.json (Telegram).',
  'error.corrupted_json':
    'Este archivo JSON parece incompleto o dañado. Prueba a exportar el chat de nuevo.',
  'error.corrupted_zip': 'Este archivo ZIP parece dañado. Prueba a exportar el chat de nuevo.',
  'error.no_messages':
    'No encontramos mensajes en este periodo. Prueba con un periodo más largo o con otro chat.',
  'error.too_large':
    'Este archivo es demasiado grande para la memoria de tu dispositivo. Prueba a exportar un solo chat sin archivos.',
  'error.unknown': 'Algo inesperado ha pasado. Inténtalo de nuevo o prueba con otra exportación.',
  'error.retry': 'Probar otro archivo',
  'error.reload': 'Recargar la página',

  // ---- privacy page
  'privacyPage.title': 'Privacidad, en palabras sencillas',
  'privacyPage.lead': 'En resumen: tu chat nunca sale de tu dispositivo. Esto es lo que significa.',
  'privacyPage.h1': 'No se sube nada',
  'privacyPage.p1':
    'Cuando eliges un archivo, tu navegador lo lee directamente. El análisis se hace dentro de esta página, en tu móvil u ordenador. No hay ningún servidor que reciba tu chat, porque no hay servidor en absoluto: el sitio son solo archivos estáticos.',
  'privacyPage.h2': 'El navegador lo garantiza',
  'privacyPage.p2':
    "La página incluye una Content Security Policy estricta que bloquea cualquier petición de red (connect-src 'none'). Aunque alguien quisiera, el código no podría enviar tu chat a ningún sitio.",
  'privacyPage.h3': 'Sin rastreo',
  'privacyPage.p3':
    'Sin analíticas, sin cookies, sin anuncios, sin scripts ni fuentes de terceros. Solo recordamos tu idioma y tema en el almacenamiento local de tu navegador.',
  'privacyPage.h4': 'Tus imágenes, tu decisión',
  'privacyPage.p4':
    'Las imágenes guardadas se crean en tu dispositivo. Usa «Ocultar nombres» antes de compartir si quieres mantener los nombres en privado. Nada se comparte a menos que tú lo compartas.',
  'privacyPage.h5': 'Cerrar la pestaña lo borra todo',
  'privacyPage.p5':
    'Tu chat solo vive en la memoria de esta pestaña. Cierra o recarga la página y desaparece.',
}

export const esAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Filosofía de medianoche',
    description:
      '{count} mensajes entre la medianoche y las 5. Las grandes ideas piden cielo oscuro.',
  },
  'voice-note-villain': {
    title: 'La amenaza de los audios',
    description: '{count} notas de voz. ¿Para cuándo el pódcast?',
  },
  'seen-at': {
    title: 'Visto a las 14:14',
    description: 'Tiempo medio de respuesta: {duration}. Lo bueno se hace esperar.',
  },
  'speed-demon': {
    title: 'Pulgares supersónicos',
    description: 'Responde en {duration} (mediana). ¿Tus pulgares están bien?',
  },
  'essay-writer': {
    title: 'Ensayista',
    description: '{count} palabras por mensaje de media. ¿Para cuándo el capítulo dos?',
  },
  'hype-machine': {
    title: 'Máquina de euforia',
    description: '{count} exclamaciones y emojis. ¡¡¡Pura energía!!!',
  },
  'ghost-mode': {
    title: 'Modo fantasma',
    description: 'Una vez desapareció {duration} antes de responder. Escalofriante.',
  },
  'conversation-starter': {
    title: 'Chispa inicial',
    description: 'Inició el {pct} de las conversaciones. El despertador del chat.',
  },
  'topic-killer': {
    title: 'Mata-temas',
    description: 'Tuvo la última palabra antes de un largo silencio {count} veces. Micro al suelo.',
  },
  'chief-laughing-officer': {
    title: 'Dirección General de Risas',
    description: '{count} risas registradas. El mejor público del mundo.',
  },
  'sticker-mafia': {
    title: 'La mafia de los stickers',
    description: '{count} stickers desplegados. Las palabras están sobrevaloradas.',
  },
  'question-detective': {
    title: 'Detective de interrogantes',
    description: 'Hizo {count} preguntas. Nivel de curiosidad: al máximo.',
  },
  'sorry-champion': {
    title: 'Campeonato del perdón',
    description: 'Pidió perdón {count} veces. Seguramente incluso sin motivo.',
  },
  'gratitude-guru': {
    title: 'Gurú de la gratitud',
    description: 'Dio las gracias {count} veces. Modales: impecables.',
  },
  'love-letter': {
    title: 'Carta de amor',
    description: 'Dijo «te quiero» {count} veces. Nivel de ternura: crítico.',
  },
  'certified-ok': {
    title: 'OK certificado',
    description: 'Dijo «ok» {count} veces. Eficiente. Misterioso. Ok.',
  },
  'triple-texter': {
    title: 'Triple mensaje',
    description: 'Envió 3+ mensajes seguidos {count} veces. ¿Para qué decirlo una vez?',
  },
  'early-bird': {
    title: 'Madrugón de oro',
    description: '{count} mensajes entre las 5 y las 9. ¿Café? Primero, el chat.',
  },
  'weekend-warrior': {
    title: 'Alma del finde',
    description: 'El {pct} de sus mensajes caen en fin de semana. Protagonista de los sábados.',
  },
  'emoji-artist': {
    title: 'Artista del emoji',
    description: 'Usó {count} emojis distintos. Puro arte visual.',
  },
  paparazzi: {
    title: 'Paparazzi',
    description: 'Compartió {count} fotos y vídeos. Sin foto, no pasó.',
  },
  'master-of-brevity': {
    title: 'Maestría de la brevedad',
    description: 'Solo {count} palabras por mensaje. ¿Para qué gastar letras?',
  },
  'main-character': {
    title: 'Protagonista',
    description: 'Envió el {pct} de todos los mensajes. Este chat es su show.',
  },
  'undo-button': {
    title: 'El botón de deshacer',
    description: 'Borró {count} mensajes. Nunca lo sabremos…',
  },
  icebreaker: {
    title: 'Rompehielos',
    description: 'Rompió el silencio más largo ({duration}). Heroicidad pura.',
  },
  'office-hours-hero': {
    title: 'Estrella de oficina',
    description: '{count} mensajes entre semana, de 9 a 5. Trabajando a tope, ¿no?',
  },
  'walking-dictionary': {
    title: 'Diccionario andante',
    description: 'Usó {count} palabras distintas. Vocabulario de lujo.',
  },
  'caps-lock': {
    title: 'FAN DE LAS MAYÚSCULAS',
    description: '{count} MENSAJES EN MAYÚSCULAS. TE OÍMOS.',
  },
  'link-librarian': {
    title: 'Biblioteca de enlaces',
    description: 'Compartió {count} enlaces. Deberes para todos.',
  },
  'reply-master': {
    title: 'Maestría en respuestas',
    description: 'Respondió citando {count} veces. El contexto lo es todo.',
  },
  'forwarding-department': {
    title: 'Departamento de reenvíos',
    description: 'Reenvió {count} mensajes. El noticiero personal del chat.',
  },
  'loyal-regular': {
    title: 'Presencia fiel',
    description: '{count} mensajes de presencia constante y acogedora. El chat no sería lo mismo.',
  },
  'quiet-legend': {
    title: 'Leyenda silenciosa',
    description: 'Habla poco, pero cada uno de sus {count} mensajes vale oro.',
  },
  'prime-time': {
    title: 'Hora estelar',
    description: 'Su hora fuerte: las {hour}:00. Sincroniza tu reloj.',
  },
}
