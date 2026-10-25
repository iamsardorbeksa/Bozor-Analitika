import type { AwardTexts, Dict } from './en'

/** Russian. Plurals: "one|few|many" (1 сообщение | 2 сообщения | 5 сообщений). */
export const ru: Dict = {
  'common.others': 'Остальные ({n})',
  'common.person': 'Участник {letter}',
  'common.back': 'Назад',

  'unit.messages': 'сообщение|сообщения|сообщений',
  'unit.times': '{n} раз|{n} раза|{n} раз',
  'unit.daysInARow': 'день подряд|дня подряд|дней подряд',

  'card.footer.made': 'Сделано в {name}',
  'card.footer.cta': 'Сделай свой → {url}',

  'card.intro.titleYear': 'Ваш {year} в чате',
  'card.intro.title': 'Ваш чат, итоги',
  'card.intro.group': '{n} человек, один чат',
  'card.intro.tap': 'Нажми, чтобы начать',

  'card.total.label': 'Всего сообщений: {n}',
  'card.total.kicker': 'Вместе вы отправили',
  'card.total.kickerGroup': 'Эта группа отправила',
  'card.total.words': '{n} слово|{n} слова|{n} слов',
  'card.total.days': '{n} день общения|{n} дня общения|{n} дней общения',
  'card.total.perDay': '≈ {n} сообщений в активный день',
  'card.total.busiest': 'Самый активный день',
  'card.total.busiestCount': '{n} сообщение за день|{n} сообщения за день|{n} сообщений за день',

  'card.who.kicker': 'Кто болтает больше?',
  'card.who.balanced': 'Идеальный баланс, как и должно быть',
  'card.who.more': 'Больше всех пишет {name}',
  'card.who.msgs': '{n} сообщ.',
  'card.who.longer': '{name} пишет длиннее: в среднем {n} слов против {m}.',
  'card.who.groupTitle': '{name} — душа этого чата',

  'card.peak.kicker': 'Ваш час пик',
  'card.peak.chartLabel': 'Сообщения по часам суток',
  'card.peak.day': 'Самый активный день недели',
  'card.peak.vibe.night': 'Настоящие совы 🦉',
  'card.peak.vibe.morning': 'Кажется, вы жаворонки ☀️',
  'card.peak.vibe.lunch': 'Болтуны обеденного перерыва 🥪',
  'card.peak.vibe.afternoon': 'Дневной спад? Только не у вас 💬',
  'card.peak.vibe.evening': 'Вечер — ваше время 🌆',

  'card.silence.kicker': 'Самая долгая тишина',
  'card.silence.between': 'С {from} по {to}',
  'card.silence.broke': 'Тишину прервало сообщение от {name}.',
  'card.streak.kicker': 'Самая длинная серия',
  'card.streak.active': 'Переписывались {n} из {m} дней',

  'card.reply.kicker': 'Скорость ответа',
  'card.reply.fastest': 'Быстрее всех отвечает {name}',
  'card.reply.median': 'медианное время ответа',
  'card.reply.slowest': '{name} не торопится. Хорошее стоит ожидания.',

  'card.words.kicker': 'Топ слов',
  'card.words.title': 'Ваши любимые слова',
  'card.words.titleGroup': 'Слова, которые вас описывают',

  'card.emoji.kicker': 'Эмодзи чата',
  'card.emoji.used': 'раз использовано',

  'card.laugh.kicker': 'Смехометр',
  'card.laugh.total': '{n} смешков на 100 сообщений',
  'card.laugh.most': 'Больше всех смеётся {name}',
  'card.laugh.rating.club': 'Камеди-клаб 🎤',
  'card.laugh.rating.vibes': 'Только хорошие вайбы ✨',
  'card.laugh.rating.smiles': 'Тихонько хихикаем 🙂',
  'card.laugh.rating.serious': 'Серьёзные люди 🧐',

  'card.awards.kicker': 'И награда достаётся',

  'card.starter.kicker': 'Кто пишет первым?',
  'card.starter.title': 'Разговор начинает {name}',
  'card.starter.of': 'из {n} разговоров',
  'card.starter.killer': 'Убийца тем: {name}',
  'card.starter.double': 'Больше всего серий из 3+ сообщений: {name}',

  'card.summary.kicker': 'Итоги вашего чата',
  'card.summary.titleGroup': 'Наш групповой чат',
  'card.summary.messages': 'Сообщения',
  'card.summary.days': 'Дней общения',
  'card.summary.peak': 'Час пик',
  'card.summary.streak': 'Лучшая серия',
  'card.summary.emoji': 'Топ эмодзи',
  'card.summary.word': 'Топ слово',
  'card.summary.fastest': 'Быстрый ответ',
  'card.summary.laughs': 'Смешки',
  'card.summary.duration': 'История длиной {d}',

  'cardTitle.intro': 'Начало',
  'cardTitle.total': 'Всего сообщений',
  'cardTitle.who': 'Кто пишет больше',
  'cardTitle.peak': 'Час пик',
  'cardTitle.silence': 'Тишина и серия',
  'cardTitle.reply': 'Скорость ответа',
  'cardTitle.words': 'Топ слов',
  'cardTitle.emojis': 'Топ эмодзи',
  'cardTitle.laugh': 'Смехометр',
  'cardTitle.awards': 'Награды: {names}',
  'cardTitle.starter': 'Кто пишет первым',
  'cardTitle.summary': 'Итоги',

  'story.progress': 'Карточки',
  'story.goTo': 'Перейти к карточке {n}: {title}',
  'story.announce': 'Карточка {n} из {total}: {title}',
  'story.close': 'Закрыть',
  'story.hideNames': 'Скрыть имена',
  'story.settings': 'Настройки',
  'story.carousel': 'Ваша история. Нажмите на правую часть или → для следующей карточки.',
  'story.prev': 'Предыдущая карточка',
  'story.next': 'Следующая карточка',
  'story.recomputing': 'Пересчитываем…',
  'story.save': 'Сохранить',
  'story.share': 'Поделиться',
  'story.saveAll': 'Все (ZIP)',
  'story.saving': 'Создаём картинку…',
  'story.preparing': 'Готовим…',
  'story.zipping': 'Упаковываем карточки…',
  'story.saved': 'Сохранено в загрузки',
  'story.savedAll': 'Все карточки сохранены в ZIP',
  'story.exportError': 'Не получилось создать картинку. Попробуйте ещё раз.',
  'share.text': 'Итоги моего чата 🎁 Сделай свои (100% приватно): {url}',

  'settings.title': 'Настройки',
  'settings.hideNamesHelp':
    'Показывать «Участник A / Участник B» вместо настоящих имён на всех карточках.',
  'settings.language': 'Язык',

  'range.label': 'Период',
  'range.all': 'Всё время',
  'range.year': 'Последний год',
  'range.6months': 'Последние 6 месяцев',
  'range.30days': 'Последние 30 дней',

  'dates.title': 'Формат даты',
  'dates.current': 'Даты читаются как {format}.',
  'dates.dmy': 'день/месяц',
  'dates.mdy': 'месяц/день',
  'dates.guess': '(наша догадка)',
  'dates.wrong': 'Даты неверные? Использовать {format}',

  'nav.privacy': 'Приватность',
  'nav.faq': 'Вопросы',
  'nav.howto': 'Как экспортировать',
  'nav.home': 'Главная',
  'theme.toLight': 'Светлая тема',
  'theme.toDark': 'Тёмная тема',
  'lang.label': 'Язык',
  'skip.toContent': 'Перейти к содержимому',

  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Итоги вашего чата.',
  'hero.subtitle':
    'Превратите любой чат в смешную и яркую историю: кто пишет первым, кто пропадает, ваши любимые эмодзи и очень честные награды.',
  'hero.cta': 'Сделать мои итоги',
  'hero.demo': 'Посмотреть демо',
  'privacy.badge': 'Ваш чат никогда не покидает устройство',
  'privacy.short': 'Без загрузок. Без серверов. Без слежки. Всё работает в вашем браузере.',

  'upload.title': 'Загрузите чат',
  'upload.tabs': 'Выберите приложение',
  'upload.drop': 'Перетащите файл чата сюда',
  'upload.dropActive': 'Отпускайте!',
  'upload.or': 'или',
  'upload.button': 'Выбрать файл',
  'upload.buttonPrivacy': 'Остаётся на вашем устройстве',
  'upload.accepts.whatsapp': 'WhatsApp: экспорт .txt или .zip',
  'upload.accepts.telegram': 'Telegram: файл result.json',

  'steps.title': 'Как экспортировать',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Откройте чат',
  'steps.wa.iphone.2': 'Нажмите на имя контакта или группы',
  'steps.wa.iphone.3': 'Пролистайте вниз → «Экспорт чата»',
  'steps.wa.iphone.4': 'Выберите «Без медиафайлов» и сохраните файл',
  'steps.wa.android.1': 'Откройте чат',
  'steps.wa.android.2': 'Нажмите ⋮ (три точки)',
  'steps.wa.android.3': '«Ещё» → «Экспорт чата»',
  'steps.wa.android.4': 'Выберите «Без медиафайлов» и сохраните файл',
  'steps.wa.tip': 'Можно загрузить .zip или .txt из архива — подойдёт и то, и другое.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'Мобильное приложение Telegram не умеет экспортировать чаты. Используйте Telegram Desktop (Windows, macOS или Linux).',
  'steps.tg.1': 'Откройте чат в Telegram Desktop',
  'steps.tg.2': 'Нажмите ⋮ (три точки) → «Экспорт истории чата»',
  'steps.tg.3': 'Снимите галочки с фото, видео и прочих медиа',
  'steps.tg.4': 'В «Формате» выберите «Машиночитаемый JSON»',
  'steps.tg.5': 'Нажмите «Экспортировать» и загрузите result.json',
  'steps.tg.tip': 'Экспортировали весь аккаунт? Тоже подойдёт: мы дадим выбрать чат.',

  'demo.title': 'Нет чата под рукой? Попробуйте демо',
  'demo.whatsapp': 'WhatsApp, на двоих',
  'demo.telegram': 'Группа в Telegram',
  'demo.note': 'Полностью вымышленные чаты.',
  'demo.banner': 'Демо: вымышленный чат',

  'features.private.title': '100% приватно',
  'features.private.text':
    'Файл читает ваш собственный браузер. Ничего никуда не загружается. Работает даже офлайн.',
  'features.fast.title': 'Огромный чат? Не проблема.',
  'features.fast.text': 'Полмиллиона сообщений за секунды, и телефон не зависает.',
  'features.share.title': 'Создано для сторис',
  'features.share.text':
    'Каждая карточка — картинка 1080×1920 для Instagram, TikTok или вашего чата.',

  'faq.title': 'Вопросы',
  'faq.q1': 'Это правда безопасно?',
  'faq.a1':
    'Да. Приложение работает целиком в браузере, а его политика безопасности запрещает любые сетевые соединения, поэтому ваш чат физически не может никуда уйти. Без аккаунтов, аналитики и cookies.',
  'faq.q2': 'Почему статистика выглядит странно?',
  'faq.a2':
    'Экспорт отличается в зависимости от телефона, языка и версии приложения. Если даты неверные, нажмите «Даты неверные?». Медиа считаются по заглушкам в экспорте, а время ответа учитывает только ответы в пределах 12 часов.',
  'faq.q3': 'Какие языки поддерживаются?',
  'faq.a3':
    'Считать можно на любом языке. Списки слов, смех и заглушки медиа настроены для английского, русского, узбекского, испанского, турецкого, португальского, немецкого, французского и арабского.',
  'faq.q4': 'Какого размера может быть файл?',
  'faq.a4':
    'Чаты на 500 000+ сообщений (50 МБ+) нормально работают на современном телефоне или ноутбуке. Очень старым телефонам может быть тяжело с гигантскими экспортами.',
  'faq.q5': 'Работает с групповыми чатами?',
  'faq.a5':
    'Да, до 50 человек. Самые активные участники в центре внимания, остальные — в «Остальных».',

  'footer.tagline': 'Сделано ради веселья. Ваши чаты остаются вашими.',
  'footer.noTracking': 'Без трекеров, cookies и серверов.',

  'loading.title': 'Читаем ваш чат…',
  'loading.reading': 'Открываем файл',
  'loading.parsing': 'Читаем сообщения',
  'loading.computing': 'Считаем цифры',
  'loading.local': 'Всё это происходит на вашем устройстве.',

  'setup.title': 'Всё готово!',
  'setup.messages': '{n} сообщение|{n} сообщения|{n} сообщений',
  'setup.people': '{n} участник|{n} участника|{n} участников',
  'setup.range': 'За какой период?',
  'setup.generate': 'Создать итоги',
  'setup.pickChat': 'В экспорте несколько чатов. Выберите один:',
  'setup.chatMessages': '{n} сообщение|{n} сообщения|{n} сообщений',
  'setup.another': 'Выбрать другой файл',
  'setup.andMore': '+ещё {n}',

  'error.title': 'Хм, не получилось',
  'error.empty': 'Файл пустой. Попробуйте экспортировать чат ещё раз.',
  'error.unrecognized':
    'Не удалось распознать файл. Загрузите экспорт WhatsApp (.txt или .zip) или result.json из Telegram.',
  'error.telegram_html':
    'Похоже, это HTML-экспорт Telegram. Экспортируйте чат заново в Telegram Desktop, выбрав формат «Машиночитаемый JSON», и загрузите result.json.',
  'error.zip_no_chat':
    'В этом ZIP нет файла чата. Ищите _chat.txt (WhatsApp) или result.json (Telegram).',
  'error.corrupted_json':
    'JSON-файл повреждён или неполный. Попробуйте экспортировать чат ещё раз.',
  'error.corrupted_zip': 'ZIP-файл повреждён. Попробуйте экспортировать чат ещё раз.',
  'error.no_messages': 'За этот период сообщений нет. Выберите период подлиннее или другой чат.',
  'error.too_large':
    'Файл слишком большой для памяти устройства. Попробуйте экспортировать один чат без медиа.',
  'error.unknown': 'Что-то пошло не так. Попробуйте ещё раз или используйте другой экспорт.',
  'error.retry': 'Попробовать другой файл',
  'error.reload': 'Перезагрузить страницу',

  'privacyPage.title': 'Приватность простыми словами',
  'privacyPage.lead': 'Коротко: ваш чат никогда не покидает устройство. Вот что это значит.',
  'privacyPage.h1': 'Ничего не загружается',
  'privacyPage.p1':
    'Когда вы выбираете файл, его читает сам браузер. Анализ происходит внутри этой страницы на вашем телефоне или компьютере. Нет сервера, который получает ваш чат, потому что сервера нет вообще: сайт — это просто статические файлы.',
  'privacyPage.h2': 'Это гарантирует браузер',
  'privacyPage.p2':
    "Страница использует строгую политику безопасности контента (CSP), которая блокирует любые сетевые запросы (connect-src 'none'). Даже если бы кто-то захотел, код не смог бы никуда отправить ваш чат.",
  'privacyPage.h3': 'Никакой слежки',
  'privacyPage.p3':
    'Без аналитики, cookies, рекламы, сторонних скриптов и шрифтов. Мы запоминаем только выбранный язык и тему в локальном хранилище вашего браузера.',
  'privacyPage.h4': 'Ваши картинки — ваш выбор',
  'privacyPage.p4':
    'Картинки создаются на вашем устройстве. Включите «Скрыть имена» перед публикацией, если хотите сохранить имена в тайне. Ничего не публикуется без вашего участия.',
  'privacyPage.h5': 'Закрыли вкладку — всё удалено',
  'privacyPage.p5':
    'Чат живёт только в памяти этой вкладки. Закройте или обновите страницу — и его нет.',
}

export const ruAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Полуночный философ',
    description: '{count} сообщений между полуночью и 5 утра. Глубоким мыслям нужна темнота.',
  },
  'voice-note-villain': {
    title: 'Злодей голосовых',
    description: '{count} голосовых. Когда запуск подкаста?',
  },
  'seen-at': {
    title: 'Прочитано в 14:14',
    description: 'Медианное время ответа: {duration}. Хорошее стоит ожидания.',
  },
  'speed-demon': {
    title: 'Скоростной демон',
    description: 'Отвечает за {duration} (медиана). Пальцы в порядке?',
  },
  'essay-writer': {
    title: 'Автор эссе',
    description: 'В среднем {count} слов в сообщении. Когда вторая глава?',
  },
  'hype-machine': {
    title: 'Машина хайпа',
    description: '{count} восклицательных знаков и эмодзи. Чистая энергия!!!',
  },
  'ghost-mode': {
    title: 'Режим призрака',
    description: 'Однажды исчезновение длилось {duration}. Жутковато.',
  },
  'conversation-starter': {
    title: 'Заводила',
    description: 'Начинает {pct} всех разговоров. Будильник этого чата.',
  },
  'topic-killer': {
    title: 'Убийца тем',
    description: 'Последнее слово перед долгой тишиной — {count} раз. Микрофон упал.',
  },
  'chief-laughing-officer': {
    title: 'Главный по смеху',
    description: '{count} смешков. Лучшая публика на свете.',
  },
  'sticker-mafia': {
    title: 'Стикерная мафия',
    description: '{count} стикеров. Слова переоценены.',
  },
  'question-detective': {
    title: 'Детектив вопросительных знаков',
    description: '{count} вопросов. Любопытство на максимуме.',
  },
  'sorry-champion': {
    title: 'Чемпион по извинениям',
    description: '{count} извинений. Наверняка даже без повода.',
  },
  'gratitude-guru': {
    title: 'Гуру благодарности',
    description: '«Спасибо» — {count} раз. Манеры безупречны.',
  },
  'love-letter': {
    title: 'Любовное письмо',
    description: '{count} признаний в любви. Уровень милоты: критический.',
  },
  'certified-ok': {
    title: 'Мастер «ок»',
    description: '«Ок» — {count} раз. Коротко. Загадочно. Ок.',
  },
  'triple-texter': {
    title: 'Мастер серий',
    description: '3+ сообщения подряд — {count} раз. Зачем говорить один раз?',
  },
  'early-bird': {
    title: 'Ранняя пташка',
    description: '{count} сообщений с 5 до 9 утра. Кофе подождёт.',
  },
  'weekend-warrior': {
    title: 'Воин выходных',
    description: '{pct} сообщений — в выходные. Звезда субботы.',
  },
  'emoji-artist': {
    title: 'Эмодзи-художник',
    description: '{count} разных эмодзи. Настоящий визуальный рассказчик.',
  },
  paparazzi: {
    title: 'Папарацци',
    description: '{count} фото и видео. Нет фото — не было.',
  },
  'master-of-brevity': {
    title: 'Мастер краткости',
    description: 'Всего {count} слова на сообщение. Зачем тратить буквы?',
  },
  'main-character': {
    title: 'Главный герой',
    description: '{pct} всех сообщений. Этот чат — личное шоу.',
  },
  'undo-button': {
    title: 'Кнопка «Отмена»',
    description: 'Удалено {count} сообщений. Мы никогда не узнаем…',
  },
  icebreaker: {
    title: 'Ледокол',
    description: 'Прервать самую долгую тишину ({duration}) — настоящий подвиг.',
  },
  'office-hours-hero': {
    title: 'Герой рабочего дня',
    description: '{count} сообщений в будни с 9 до 17. Работа кипит, да?',
  },
  'walking-dictionary': {
    title: 'Ходячий словарь',
    description: '{count} разных слов. Словарный запас впечатляет.',
  },
  'caps-lock': {
    title: 'ФАНАТ CAPS LOCK',
    description: '{count} СООБЩЕНИЙ КАПСОМ. МЫ СЛЫШИМ.',
  },
  'link-librarian': {
    title: 'Библиотекарь ссылок',
    description: '{count} ссылок. Домашка для всех.',
  },
  'reply-master': {
    title: 'Мастер цитат',
    description: '{count} ответов с цитатой. Контекст — наше всё.',
  },
  'forwarding-department': {
    title: 'Отдел пересылок',
    description: '{count} пересланных сообщений. Личная лента новостей чата.',
  },
  'loyal-regular': {
    title: 'Верный завсегдатай',
    description: '{count} сообщений стабильного уюта. Без этого чат был бы другим.',
  },
  'quiet-legend': {
    title: 'Тихая легенда',
    description: 'Пишет редко, но каждое из {count} сообщений — на вес золота.',
  },
  'prime-time': {
    title: 'Звезда прайм-тайма',
    description: 'Пик активности — около {hour}:00. Сверяйте часы.',
  },
}
