import type { AwardTexts, Dict } from './en'

/** Arabic (Modern Standard). Plurals: "zero|one|two|few|many|other" (0 | 1 | 2 | 3–10 | 11–99 | 100+). */
export const ar: Dict = {
  // ---- common
  'common.others': 'الآخرون ({n})',
  'common.person': 'المشارك {letter}',
  'common.back': 'رجوع',

  // ---- units (plural)
  'unit.messages': 'رسالة|رسالة|رسالتان|رسائل|رسالة|رسالة',
  'unit.times': '{n} مرة|{n} مرة|{n} مرتان|{n} مرات|{n} مرة|{n} مرة',
  'unit.daysInARow': 'يوم متتالٍ|يوم متتالٍ|يومان متتاليان|أيام متتالية|يومًا متتاليًا|يوم متتالٍ',

  // ---- card chrome
  'card.footer.made': 'صُنع بواسطة {name}',
  'card.footer.cta': 'اصنع ملخصك → {url}',

  // ---- intro
  'card.intro.titleYear': 'عامكم {year} في الدردشة',
  'card.intro.title': 'ملخص دردشتكم',
  'card.intro.group': '{n} من الأعضاء، ودردشة واحدة',
  'card.intro.tap': 'انقر للبدء',

  // ---- total
  'card.total.label': '{n} رسالة إجمالًا',
  'card.total.kicker': 'معًا أرسلتم',
  'card.total.kickerGroup': 'أرسلت هذه المجموعة',
  'card.total.words': '{n} كلمة|{n} كلمة|{n} كلمتان|{n} كلمات|{n} كلمة|{n} كلمة',
  'card.total.days':
    '{n} يوم من الدردشة|{n} يوم من الدردشة|{n} يومان من الدردشة|{n} أيام من الدردشة|{n} يومًا من الدردشة|{n} يوم من الدردشة',
  'card.total.perDay': '≈ {n} رسالة في كل يوم نشط',
  'card.total.busiest': 'أكثر الأيام ازدحامًا',
  'card.total.busiestCount':
    '{n} رسالة في ذلك اليوم|{n} رسالة في ذلك اليوم|{n} رسالتان في ذلك اليوم|{n} رسائل في ذلك اليوم|{n} رسالة في ذلك اليوم|{n} رسالة في ذلك اليوم',

  // ---- who talks more
  'card.who.kicker': 'من يتكلم أكثر؟',
  'card.who.balanced': 'توازن مثالي، كما ينبغي أن تكون كل الأشياء',
  'card.who.more': 'معظم الكلام من نصيب {name}',
  'card.who.msgs': '{n} رسالة',
  'card.who.longer': 'رسائل {name} أطول: {n} كلمة في المتوسط مقابل {m}.',
  'card.who.groupTitle': 'زمام هذه الدردشة بيد {name}',

  // ---- peak hour
  'card.peak.kicker': 'ساعة الذروة',
  'card.peak.chartLabel': 'الرسائل حسب ساعات اليوم',
  'card.peak.day': 'أنشط أيام الأسبوع',
  'card.peak.vibe.night': 'سهّيرة معتمدون 🦉',
  'card.peak.vibe.morning': 'من عشاق الصباح على ما يبدو ☀️',
  'card.peak.vibe.lunch': 'دردشة استراحة الغداء 🥪',
  'card.peak.vibe.afternoon': 'خمول العصر؟ ليس هنا 💬',
  'card.peak.vibe.evening': 'المساء هو وقتكم الذهبي 🌆',

  // ---- silence / streak
  'card.silence.kicker': 'أطول صمت',
  'card.silence.between': 'من {from} إلى {to}',
  'card.silence.broke': 'وأخيرًا، كسرُ الصمت جاء من {name}.',
  'card.streak.kicker': 'أطول سلسلة',
  'card.streak.active': 'أيام الدردشة: {n} من أصل {m}',

  // ---- reply speed
  'card.reply.kicker': 'سرعة الرد',
  'card.reply.fastest': 'الأسرع في الرد: {name}',
  'card.reply.median': 'متوسط زمن الرد (الوسيط)',
  'card.reply.slowest': '{name}: على مهلٍ دائمًا. وفي التأني السلامة.',

  // ---- words
  'card.words.kicker': 'أكثر الكلمات',
  'card.words.title': 'كلماتكم المفضلة',
  'card.words.titleGroup': 'الكلمات التي تختصركم',

  // ---- emoji
  'card.emoji.kicker': 'إيموجي الدردشة',
  'card.emoji.used': 'مرة استخدام',

  // ---- laugh
  'card.laugh.kicker': 'مقياس الضحك',
  'card.laugh.total': '{n} ضحكة لكل 100 رسالة',
  'card.laugh.most': 'الأكثر ضحكًا: {name}',
  'card.laugh.rating.club': 'نادي الكوميديا 🎤',
  'card.laugh.rating.vibes': 'أجواء حلوة فقط ✨',
  'card.laugh.rating.smiles': 'ضحكات خفيفة 🙂',
  'card.laugh.rating.serious': 'جدّية تامة 🧐',

  // ---- awards
  'card.awards.kicker': 'والجائزة تذهب إلى',

  // ---- starter
  'card.starter.kicker': 'من يبدأ أولًا؟',
  'card.starter.title': 'بدء الحديث غالبًا من {name}',
  'card.starter.of': 'من أصل {n} محادثة',
  'card.starter.killer': 'قاتل المواضيع: {name}',
  'card.starter.double': 'أكثر من يرسل 3 رسائل متتالية: {name}',

  // ---- summary
  'card.summary.kicker': 'ملخص دردشتكم',
  'card.summary.titleGroup': 'دردشة مجموعتنا',
  'card.summary.messages': 'الرسائل',
  'card.summary.days': 'أيام الدردشة',
  'card.summary.peak': 'ساعة الذروة',
  'card.summary.streak': 'أفضل سلسلة',
  'card.summary.emoji': 'أكثر إيموجي',
  'card.summary.word': 'أكثر كلمة',
  'card.summary.fastest': 'أسرع رد',
  'card.summary.laughs': 'الضحكات',
  'card.summary.duration': 'حكاية امتدت {d}',

  // ---- card titles (accessibility + file names)
  'cardTitle.intro': 'المقدمة',
  'cardTitle.total': 'إجمالي الرسائل',
  'cardTitle.who': 'من يتكلم أكثر',
  'cardTitle.peak': 'ساعة الذروة',
  'cardTitle.silence': 'أطول صمت وأطول سلسلة',
  'cardTitle.reply': 'سرعة الرد',
  'cardTitle.words': 'أكثر الكلمات',
  'cardTitle.emojis': 'أكثر الإيموجي',
  'cardTitle.laugh': 'مقياس الضحك',
  'cardTitle.awards': 'الجوائز: {names}',
  'cardTitle.starter': 'من يبدأ أولًا',
  'cardTitle.summary': 'الملخص',

  // ---- story viewer
  'story.progress': 'البطاقات',
  'story.goTo': 'الانتقال إلى البطاقة {n}: {title}',
  'story.announce': 'البطاقة {n} من {total}: {title}',
  'story.close': 'إغلاق',
  'story.hideNames': 'إخفاء الأسماء',
  'story.settings': 'الإعدادات',
  'story.carousel': 'قصة ملخصك. انقر على الجانب الأيمن أو اضغط → للبطاقة التالية.',
  'story.prev': 'البطاقة السابقة',
  'story.next': 'البطاقة التالية',
  'story.recomputing': 'جارٍ إعادة الحساب…',
  'story.save': 'حفظ الصورة',
  'story.share': 'مشاركة',
  'story.saveAll': 'الكل (ZIP)',
  'story.saving': 'جارٍ إنشاء الصورة…',
  'story.preparing': 'جارٍ التحضير…',
  'story.zipping': 'جارٍ تجميع البطاقات…',
  'story.saved': 'تم الحفظ في التنزيلات',
  'story.savedAll': 'تم حفظ كل البطاقات في ملف ZIP',
  'story.exportError': 'تعذّر إنشاء الصورة. حاول مرة أخرى.',
  'share.text': 'ملخص دردشتي 🎁 اصنع ملخصك (خصوصية 100%): {url}',

  // ---- settings
  'settings.title': 'الإعدادات',
  'settings.hideNamesHelp': 'يعرض “المشارك A / المشارك B” بدل الأسماء الحقيقية في كل البطاقات.',
  'settings.language': 'اللغة',

  // ---- time range
  'range.label': 'الفترة الزمنية',
  'range.all': 'كل الوقت',
  'range.year': 'آخر سنة',
  'range.6months': 'آخر 6 أشهر',
  'range.30days': 'آخر 30 يومًا',

  // ---- date order
  'dates.title': 'تنسيق التاريخ',
  'dates.current': 'تُقرأ التواريخ بتنسيق {format}.',
  'dates.dmy': 'يوم/شهر',
  'dates.mdy': 'شهر/يوم',
  'dates.guess': '(أفضل تخمين لدينا)',
  'dates.wrong': 'التواريخ غير صحيحة؟ استخدم {format}',

  // ---- navigation & theme
  'nav.privacy': 'الخصوصية',
  'nav.faq': 'الأسئلة الشائعة',
  'nav.howto': 'طريقة التصدير',
  'nav.home': 'الرئيسية',
  'theme.toLight': 'التبديل إلى الوضع الفاتح',
  'theme.toDark': 'التبديل إلى الوضع الداكن',
  'lang.label': 'اللغة',
  'skip.toContent': 'تخطٍّ إلى المحتوى',

  // ---- hero
  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'دردشتك، في ملخص.',
  'hero.subtitle':
    'حوّل أي دردشة إلى قصة مضحكة وملوّنة: من يبدأ أولًا، ومن يختفي، وأكثر الإيموجي استخدامًا، وجوائز صريحة جدًا.',
  'hero.cta': 'اصنع ملخصي',
  'hero.demo': 'جرّب العرض التوضيحي',
  'privacy.badge': 'دردشتك لا تغادر جهازك أبدًا',
  'privacy.short': 'لا رفع، لا خوادم، لا تتبع. كل شيء يعمل داخل متصفحك.',

  // ---- upload
  'upload.title': 'ارفع دردشتك',
  'upload.tabs': 'اختر التطبيق',
  'upload.drop': 'أفلت ملف الدردشة هنا',
  'upload.dropActive': 'أفلته!',
  'upload.or': 'أو',
  'upload.button': 'اختر ملفًا',
  'upload.buttonPrivacy': 'يبقى على جهازك',
  'upload.accepts.whatsapp': 'WhatsApp: ملف تصدير .txt أو .zip',
  'upload.accepts.telegram': 'Telegram: ملف تصدير result.json',

  // ---- export steps
  'steps.title': 'طريقة التصدير',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'افتح الدردشة',
  'steps.wa.iphone.2': 'انقر على اسم جهة الاتصال أو المجموعة',
  'steps.wa.iphone.3': 'مرّر للأسفل وانقر على “تصدير الدردشة”',
  'steps.wa.iphone.4': 'اختر “بدون وسائط” واحفظ الملف',
  'steps.wa.android.1': 'افتح الدردشة',
  'steps.wa.android.2': 'انقر على ⋮ (النقاط الثلاث)',
  'steps.wa.android.3': 'انقر على “المزيد” → “تصدير الدردشة”',
  'steps.wa.android.4': 'اختر “بدون وسائط” واحفظ الملف',
  'steps.wa.tip': 'ارفع ملف .zip أو ملف .txt الذي بداخله، كلاهما يعمل.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'تطبيق Telegram على الهاتف لا يستطيع تصدير الدردشات. استخدم Telegram Desktop (على Windows أو macOS أو Linux).',
  'steps.tg.1': 'افتح الدردشة في Telegram Desktop',
  'steps.tg.2': 'انقر على ⋮ (النقاط الثلاث) → “تصدير سجل الدردشة”',
  'steps.tg.3': 'ألغِ تحديد الصور والفيديوهات وكل الوسائط الأخرى',
  'steps.tg.4': 'اضبط التنسيق على “JSON قابل للقراءة آليًا”',
  'steps.tg.5': 'انقر على “تصدير”، ثم ارفع ملف result.json',
  'steps.tg.tip': 'صدّرت حسابك بالكامل؟ ارفعه أيضًا، وسنتيح لك اختيار دردشة.',

  // ---- demo
  'demo.title': 'لا توجد دردشة في متناولك؟ جرّب العرض التوضيحي',
  'demo.whatsapp': 'WhatsApp: دردشة ثنائية',
  'demo.telegram': 'Telegram: مجموعة',
  'demo.note': 'دردشات نموذجية خيالية بالكامل.',
  'demo.banner': 'وضع العرض التوضيحي: دردشة خيالية',

  // ---- features
  'features.private.title': 'خصوصية 100%',
  'features.private.text': 'متصفحك وحده يقرأ ملفك. لا يُرفع أي شيء أبدًا، ويعمل حتى دون اتصال.',
  'features.fast.title': 'دردشات ضخمة؟ لا مشكلة.',
  'features.fast.text': 'نصف مليون رسالة في ثوانٍ، دون أن يتجمد هاتفك.',
  'features.share.title': 'مصمَّم للقصص',
  'features.share.text': 'كل بطاقة صورة بمقاس 1080×1920، جاهزة لـ Instagram أو TikTok أو مجموعتك.',

  // ---- FAQ
  'faq.title': 'أسئلة',
  'faq.q1': 'هل هو آمن حقًا؟',
  'faq.a1':
    'نعم. يعمل التطبيق بالكامل داخل متصفحك، وسياسة الأمان الخاصة به تمنعه من إجراء أي اتصال بالشبكة، لذا يستحيل فعليًا إرسال دردشتك إلى أي مكان. لا حسابات، ولا تحليلات، ولا ملفات تعريف ارتباط.',
  'faq.q2': 'لماذا تبدو بعض الإحصاءات غير دقيقة؟',
  'faq.a2':
    'تختلف ملفات التصدير حسب الهاتف واللغة وإصدار التطبيق. إذا بدت التواريخ خاطئة، فاستخدم مفتاح “التواريخ غير صحيحة؟”. تُحسب الوسائط من النصوص البديلة في ملف التصدير، ولا تُحتسب في زمن الرد إلا الردود خلال 12 ساعة.',
  'faq.q3': 'ما اللغات المدعومة؟',
  'faq.a3':
    'العدّ يعمل مع أي لغة. أما قوائم الكلمات والضحكات والنصوص البديلة للوسائط فمضبوطة للإنجليزية والروسية والأوزبكية والإسبانية والتركية والبرتغالية والألمانية والفرنسية والعربية.',
  'faq.q4': 'ما الحجم الأقصى للملف؟',
  'faq.a4':
    'الدردشات التي تضم أكثر من 500,000 رسالة (أكثر من 50 MB) تعمل جيدًا على هاتف أو حاسوب حديث. قد تواجه الهواتف القديمة جدًا صعوبة مع الملفات الضخمة.',
  'faq.q5': 'هل يعمل مع دردشات المجموعات؟',
  'faq.a5': 'نعم، حتى 50 شخصًا. يحظى الأعضاء الأكثر نشاطًا بالأضواء، ويُجمع الباقون تحت “الآخرون”.',

  // ---- footer
  'footer.tagline': 'صُنع للمتعة. دردشاتك تبقى ملكك.',
  'footer.noTracking': 'لا أدوات تتبع، لا ملفات تعريف ارتباط، لا خوادم.',

  // ---- loading
  'loading.title': 'جارٍ قراءة دردشتك…',
  'loading.reading': 'فتح الملف',
  'loading.parsing': 'قراءة الرسائل',
  'loading.computing': 'حساب الأرقام',
  'loading.local': 'كل هذا يحدث على جهازك.',

  // ---- setup (after parsing)
  'setup.title': 'جاهز للتلخيص!',
  'setup.messages': '{n} رسالة|{n} رسالة|{n} رسالتان|{n} رسائل|{n} رسالة|{n} رسالة',
  'setup.people': '{n} مشارك|{n} مشارك|{n} مشاركان|{n} مشاركين|{n} مشاركًا|{n} مشارك',
  'setup.range': 'أي فترة؟',
  'setup.generate': 'اصنع ملخصي',
  'setup.pickChat': 'يحتوي ملف التصدير على عدة دردشات. اختر واحدة:',
  'setup.chatMessages': '{n} رسالة|{n} رسالة|{n} رسالتان|{n} رسائل|{n} رسالة|{n} رسالة',
  'setup.another': 'استخدم ملفًا آخر',
  'setup.andMore': '+{n} أخرى',

  // ---- errors
  'error.title': 'عذرًا، لم ينجح ذلك',
  'error.empty': 'هذا الملف فارغ. حاول تصدير الدردشة مرة أخرى.',
  'error.unrecognized':
    'تعذّر التعرف على هذا الملف. يُرجى رفع ملف تصدير WhatsApp (.txt أو .zip) أو ملف result.json من Telegram.',
  'error.telegram_html':
    'يبدو أن هذا تصدير HTML من Telegram. يُرجى التصدير مجددًا في Telegram Desktop مع ضبط التنسيق على “JSON قابل للقراءة آليًا”، ثم رفع ملف result.json.',
  'error.zip_no_chat':
    'لا يحتوي ملف ZIP هذا على ملف دردشة. ابحث عن _chat.txt (WhatsApp) أو result.json (Telegram).',
  'error.corrupted_json': 'يبدو ملف JSON هذا ناقصًا أو تالفًا. حاول تصدير الدردشة مرة أخرى.',
  'error.corrupted_zip': 'يبدو ملف ZIP هذا تالفًا. حاول تصدير الدردشة مرة أخرى.',
  'error.no_messages': 'لم نجد أي رسائل في هذه الفترة. جرّب فترة أطول أو دردشة أخرى.',
  'error.too_large': 'هذا الملف أكبر من ذاكرة جهازك. جرّب تصدير دردشة واحدة بدون وسائط.',
  'error.unknown': 'حدث خطأ غير متوقع. حاول مرة أخرى، أو جرّب ملف تصدير مختلفًا.',
  'error.retry': 'جرّب ملفًا آخر',
  'error.reload': 'أعد تحميل الصفحة',

  // ---- privacy page
  'privacyPage.title': 'الخصوصية بكلمات بسيطة',
  'privacyPage.lead': 'باختصار: دردشتك لا تغادر جهازك أبدًا. وإليك ما يعنيه ذلك.',
  'privacyPage.h1': 'لا يُرفع أي شيء',
  'privacyPage.p1':
    'عندما تختار ملفًا، يقرؤه متصفحك مباشرة. يجري التحليل داخل صفحة الويب هذه على هاتفك أو حاسوبك. لا يوجد خادم يستقبل دردشتك، لأنه لا يوجد خادم أصلًا: الموقع مجرد ملفات ثابتة.',
  'privacyPage.h2': 'المتصفح يفرض ذلك',
  'privacyPage.p2':
    "تأتي الصفحة مع سياسة أمان محتوى (CSP) صارمة تحظر كل طلبات الشبكة (connect-src 'none'). حتى لو أراد أحد ذلك، فلن تستطيع الشيفرة إرسال دردشتك إلى أي مكان.",
  'privacyPage.h3': 'لا تتبع',
  'privacyPage.p3':
    'لا تحليلات، ولا ملفات تعريف ارتباط، ولا إعلانات، ولا سكربتات أو خطوط من جهات خارجية. نحفظ فقط اختيارك للغة والمظهر في التخزين المحلي لمتصفحك.',
  'privacyPage.h4': 'صورك، قرارك',
  'privacyPage.p4':
    'تُنشأ الصور المحفوظة على جهازك. استخدم “إخفاء الأسماء” قبل المشاركة إن أردت إبقاء الأسماء سرية. لا يُشارك أي شيء ما لم تشاركه أنت.',
  'privacyPage.h5': 'إغلاق التبويب يحذف كل شيء',
  'privacyPage.p5': 'تعيش دردشتك فقط في ذاكرة هذا التبويب. أغلق الصفحة أو أعد تحميلها وستختفي.',
}

export const arAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'فيلسوف منتصف الليل',
    description: '{count} رسالة بين منتصف الليل والخامسة فجرًا. الأفكار العميقة تحتاج سماءً مظلمة.',
  },
  'voice-note-villain': {
    title: 'شرير الرسائل الصوتية',
    description: '{count} رسالة صوتية. متى إطلاق البودكاست؟',
  },
  'seen-at': {
    title: 'شوهدت 2:14 م',
    description: 'متوسط زمن الرد: {duration}. وفي التأني السلامة.',
  },
  'speed-demon': {
    title: 'شيطان السرعة',
    description: 'الرد خلال {duration} (في المتوسط). هل الإبهامان بخير؟',
  },
  'essay-writer': {
    title: 'كاتب المقالات',
    description: '{count} كلمة في الرسالة في المتوسط. متى الفصل الثاني؟',
  },
  'hype-machine': {
    title: 'آلة الحماس',
    description: '{count} علامة تعجب وإيموجي. طاقة خالصة!!!',
  },
  'ghost-mode': {
    title: 'وضع الشبح',
    description: 'اختفاء لمدة {duration} قبل الرد ذات مرة. مخيف.',
  },
  'conversation-starter': {
    title: 'مُشعل المحادثات',
    description: 'بدء {pct} من كل المحادثات. منبّه الدردشة الرسمي.',
  },
  'topic-killer': {
    title: 'قاتل المواضيع',
    description: 'الكلمة الأخيرة قبل صمت طويل {count} مرة. وأُسقط الميكروفون.',
  },
  'chief-laughing-officer': {
    title: 'الرئيس التنفيذي للضحك',
    description: '{count} ضحكة مسجّلة. أفضل جمهور على الإطلاق.',
  },
  'sticker-mafia': {
    title: 'مافيا الملصقات',
    description: '{count} ملصق في الميدان. الكلمات مبالغ في تقديرها.',
  },
  'question-detective': {
    title: 'محقق علامات الاستفهام',
    description: '{count} سؤال. مستوى الفضول: الحد الأقصى.',
  },
  'sorry-champion': {
    title: 'بطل الاعتذارات',
    description: '“آسف” {count} مرة. وربما حتى حين لم يكن الاعتذار ضروريًا.',
  },
  'gratitude-guru': {
    title: 'معلّم الامتنان',
    description: '“شكرًا” {count} مرة. الذوق: لا تشوبه شائبة.',
  },
  'love-letter': {
    title: 'رسالة حب',
    description: '“أحبك” {count} مرة. مستوى اللطف: حرج.',
  },
  'certified-ok': {
    title: 'خبير “أوكي” المعتمد',
    description: '“ok” {count} مرة. فعّال. غامض. أوكي.',
  },
  'triple-texter': {
    title: 'ملك الرسائل المتتالية',
    description: '3 رسائل متتالية أو أكثر {count} مرة. لماذا تقولها مرة واحدة؟',
  },
  'early-bird': {
    title: 'الطائر المبكر',
    description: '{count} رسالة بين الخامسة والتاسعة صباحًا. القهوة؟ الدردشة أولًا.',
  },
  'weekend-warrior': {
    title: 'محارب عطلة نهاية الأسبوع',
    description: '{pct} من الرسائل في عطلة نهاية الأسبوع. بطل يوم السبت.',
  },
  'emoji-artist': {
    title: 'فنان الإيموجي',
    description: '{count} إيموجي مختلفًا. راوٍ بصري حقيقي.',
  },
  paparazzi: {
    title: 'الباباراتزي',
    description: '{count} صورة وفيديو. ما لم تُصوَّر، فهي لم تحدث.',
  },
  'master-of-brevity': {
    title: 'سيد الإيجاز',
    description: '{count} كلمة فقط في الرسالة. خير الكلام ما قلّ ودلّ.',
  },
  'main-character': {
    title: 'الشخصية الرئيسية',
    description: '{pct} من كل الرسائل. هذه الدردشة عرضٌ خاص.',
  },
  'undo-button': {
    title: 'زر التراجع',
    description: '{count} رسالة محذوفة. لن نعرف أبدًا…',
  },
  icebreaker: {
    title: 'كاسر الجليد',
    description: 'كسرُ أطول صمت ({duration}). بطولة حقيقية.',
  },
  'office-hours-hero': {
    title: 'بطل ساعات الدوام',
    description: '{count} رسالة في أيام العمل من 9 إلى 5. في قمة الانشغال بالعمل، صح؟',
  },
  'walking-dictionary': {
    title: 'القاموس المتنقل',
    description: '{count} كلمة مختلفة. استعراض لغوي.',
  },
  'caps-lock': {
    title: 'عاشق الحروف الكبيرة',
    description: '{count} رسالة بأحرف كبيرة بالكامل. وصلت الرسالة!',
  },
  'link-librarian': {
    title: 'أمين مكتبة الروابط',
    description: '{count} رابط تمت مشاركته. واجب منزلي للجميع.',
  },
  'reply-master': {
    title: 'سيد الردود',
    description: '{count} رد مع اقتباس. السياق هو كل شيء.',
  },
  'forwarding-department': {
    title: 'قسم إعادة التوجيه',
    description: '{count} رسالة معاد توجيهها. نشرة أخبار الدردشة الخاصة.',
  },
  'loyal-regular': {
    title: 'الحاضر الوفي',
    description:
      '{count} رسالة من الحضور الدافئ الثابت. من دون هذا الحضور، لن تكون الدردشة كما هي.',
  },
  'quiet-legend': {
    title: 'الأسطورة الهادئة',
    description: 'كلام قليل، لكن كل رسالة من الـ{count} ذهب خالص.',
  },
  'prime-time': {
    title: 'نجم وقت الذروة',
    description: 'الأكثر نشاطًا حوالي الساعة {hour}:00. اضبطوا ساعاتكم.',
  },
}
