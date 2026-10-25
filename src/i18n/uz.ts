import type { Dict } from './en'

/** Uzbek (Latin). Uzbek nouns don't change after numbers, so plural strings use one form. */
export const uz: Dict = {
  'common.others': 'Boshqalar ({n})',
  'common.person': 'Ishtirokchi {letter}',
  'common.back': 'Orqaga',

  'unit.messages': 'xabar',
  'unit.times': '{n} marta',
  'unit.daysInARow': 'kun ketma-ket',

  'card.footer.made': '{name} bilan yaratildi',
  'card.footer.cta': 'Oʻzingiznikini yarating → {url}',

  'card.intro.titleYear': 'Chatdagi {year}-yilingiz',
  'card.intro.title': 'Chatingiz yakunlari',
  'card.intro.group': '{n} kishi, bitta chat',
  'card.intro.tap': 'Boshlash uchun bosing',

  'card.total.label': 'Jami {n} ta xabar',
  'card.total.kicker': 'Birgalikda yuborgansiz',
  'card.total.kickerGroup': 'Bu guruh yuborgan',
  'card.total.words': '{n} ta soʻz',
  'card.total.days': '{n} kun suhbat',
  'card.total.perDay': '≈ faol kunda {n} ta xabar',
  'card.total.busiest': 'Eng faol kun',
  'card.total.busiestCount': 'oʻsha kuni {n} ta xabar',

  'card.who.kicker': 'Kim koʻproq yozadi?',
  'card.who.balanced': 'Mukammal muvozanat, xuddi boʻlishi kerakdek',
  'card.who.more': 'Eng koʻp {name} yozadi',
  'card.who.msgs': '{n} xabar',
  'card.who.longer': '{name} uzunroq yozadi: oʻrtacha {n} soʻz, {m} ga qarshi.',
  'card.who.groupTitle': 'Bu chatning yuragi — {name}',

  'card.peak.kicker': 'Sizning qizgʻin soatingiz',
  'card.peak.chartLabel': 'Kun soatlari boʻyicha xabarlar',
  'card.peak.day': 'Haftaning eng faol kuni',
  'card.peak.vibe.night': 'Haqiqiy boyqushlar 🦉',
  'card.peak.vibe.morning': 'Siz ertalabki odamlarsiz ☀️',
  'card.peak.vibe.lunch': 'Tushlik tanaffusi suhbatdoshlari 🥪',
  'card.peak.vibe.afternoon': 'Tushdan keyin ham faol 💬',
  'card.peak.vibe.evening': 'Kechqurun — sizning vaqtingiz 🌆',

  'card.silence.kicker': 'Eng uzun jimlik',
  'card.silence.between': '{from} dan {to} gacha',
  'card.silence.broke': 'Jimlikni {name} buzdi.',
  'card.streak.kicker': 'Eng uzun seriya',
  'card.streak.active': '{m} kundan {n} kuni yozishgansiz',

  'card.reply.kicker': 'Javob tezligi',
  'card.reply.fastest': 'Eng tez {name} javob beradi',
  'card.reply.median': 'oʻrtacha javob vaqti (mediana)',
  'card.reply.slowest': '{name} shoshilmaydi. Sabr tagi — sariq oltin.',

  'card.words.kicker': 'Top soʻzlar',
  'card.words.title': 'Sevimli soʻzlaringiz',
  'card.words.titleGroup': 'Sizni tasvirlaydigan soʻzlar',

  'card.emoji.kicker': 'Chat emojisi',
  'card.emoji.used': 'marta ishlatilgan',

  'card.laugh.kicker': 'Kulgi-metr',
  'card.laugh.total': 'har 100 xabarga {n} ta kulgi',
  'card.laugh.most': 'Eng koʻp {name} kuladi',
  'card.laugh.rating.club': 'Komediya klubi 🎤',
  'card.laugh.rating.vibes': 'Faqat yaxshi kayfiyat ✨',
  'card.laugh.rating.smiles': 'Sekin jilmayamiz 🙂',
  'card.laugh.rating.serious': 'Jiddiy odamlar 🧐',

  'card.awards.kicker': 'Va mukofot egasi',

  'card.starter.kicker': 'Kim birinchi yozadi?',
  'card.starter.title': 'Suhbatni {name} boshlaydi',
  'card.starter.of': '{n} ta suhbatdan',
  'card.starter.killer': 'Mavzu qotili: {name}',
  'card.starter.double': 'Ketma-ket 3+ xabar ustasi: {name}',

  'card.summary.kicker': 'Chatingiz yakunlari',
  'card.summary.titleGroup': 'Guruh chatimiz',
  'card.summary.messages': 'Xabarlar',
  'card.summary.days': 'Suhbat kunlari',
  'card.summary.peak': 'Qizgʻin soat',
  'card.summary.streak': 'Eng uzun seriya',
  'card.summary.emoji': 'Top emoji',
  'card.summary.word': 'Top soʻz',
  'card.summary.fastest': 'Eng tez javob',
  'card.summary.laughs': 'Kulgilar',
  'card.summary.duration': '{d} davom etgan hikoya',

  'cardTitle.intro': 'Kirish',
  'cardTitle.total': 'Jami xabarlar',
  'cardTitle.who': 'Kim koʻproq yozadi',
  'cardTitle.peak': 'Qizgʻin soat',
  'cardTitle.silence': 'Jimlik va seriya',
  'cardTitle.reply': 'Javob tezligi',
  'cardTitle.words': 'Top soʻzlar',
  'cardTitle.emojis': 'Top emojilar',
  'cardTitle.laugh': 'Kulgi-metr',
  'cardTitle.awards': 'Mukofotlar: {names}',
  'cardTitle.starter': 'Kim birinchi yozadi',
  'cardTitle.summary': 'Yakun',

  'story.progress': 'Kartochkalar',
  'story.goTo': '{n}-kartochkaga oʻtish: {title}',
  'story.announce': '{total} tadan {n}-kartochka: {title}',
  'story.close': 'Yopish',
  'story.hideNames': 'Ismlarni yashirish',
  'story.settings': 'Sozlamalar',
  'story.carousel': 'Sizning hikoyangiz. Keyingi kartochka uchun oʻng tomonni yoki → ni bosing.',
  'story.prev': 'Oldingi kartochka',
  'story.next': 'Keyingi kartochka',
  'story.recomputing': 'Qayta hisoblanmoqda…',
  'story.save': 'Saqlash',
  'story.share': 'Ulashish',
  'story.saveAll': 'Hammasi (ZIP)',
  'story.saving': 'Rasm yaratilmoqda…',
  'story.preparing': 'Tayyorlanmoqda…',
  'story.zipping': 'Kartochkalar joylanmoqda…',
  'story.saved': 'Yuklab olishlarga saqlandi',
  'story.savedAll': 'Barcha kartochkalar ZIP sifatida saqlandi',
  'story.exportError': 'Rasm yaratib boʻlmadi. Qaytadan urinib koʻring.',
  'share.text': 'Chatim yakunlari 🎁 Oʻzingiznikini yarating (100% maxfiy): {url}',

  'settings.title': 'Sozlamalar',
  'settings.hideNamesHelp':
    'Barcha kartochkalarda haqiqiy ismlar oʻrniga “Ishtirokchi A / Ishtirokchi B” koʻrsatiladi.',
  'settings.language': 'Til',

  'range.label': 'Davr',
  'range.all': 'Butun vaqt',
  'range.year': 'Oxirgi yil',
  'range.6months': 'Oxirgi 6 oy',
  'range.30days': 'Oxirgi 30 kun',

  'dates.title': 'Sana formati',
  'dates.current': 'Sanalar {format} deb oʻqilmoqda.',
  'dates.dmy': 'kun/oy',
  'dates.mdy': 'oy/kun',
  'dates.guess': '(taxminimiz)',
  'dates.wrong': 'Sanalar notoʻgʻrimi? {format} ni tanlang',

  'nav.privacy': 'Maxfiylik',
  'nav.faq': 'Savollar',
  'nav.howto': 'Qanday eksport qilinadi',
  'nav.home': 'Bosh sahifa',
  'theme.toLight': 'Yorugʻ mavzu',
  'theme.toDark': 'Qorongʻi mavzu',
  'lang.label': 'Til',
  'skip.toContent': 'Asosiy qismga oʻtish',

  'hero.eyebrow': 'WhatsApp + Telegram',
  'hero.title': 'Chatingiz yakunlari.',
  'hero.subtitle':
    'Istalgan chatni kulgili va rang-barang hikoyaga aylantiring: kim birinchi yozadi, kim gʻoyib boʻladi, sevimli emojilaringiz va juda samimiy mukofotlar.',
  'hero.cta': 'Yakunlarimni yaratish',
  'hero.demo': 'Demoni koʻrish',
  'privacy.badge': 'Chatingiz qurilmangizdan chiqmaydi',
  'privacy.short': 'Yuklash yoʻq. Server yoʻq. Kuzatuv yoʻq. Hammasi brauzeringizda ishlaydi.',

  'upload.title': 'Chatingizni yuklang',
  'upload.tabs': 'Ilovani tanlang',
  'upload.drop': 'Chat faylini shu yerga tashlang',
  'upload.dropActive': 'Qoʻyib yuboring!',
  'upload.or': 'yoki',
  'upload.button': 'Faylni tanlash',
  'upload.buttonPrivacy': 'Qurilmangizda qoladi',
  'upload.accepts.whatsapp': 'WhatsApp: .txt yoki .zip eksport',
  'upload.accepts.telegram': 'Telegram: result.json fayli',

  'steps.title': 'Qanday eksport qilinadi',
  'steps.wa.iphone': 'iPhone',
  'steps.wa.android': 'Android',
  'steps.wa.iphone.1': 'Chatni oching',
  'steps.wa.iphone.2': 'Kontakt yoki guruh nomini bosing',
  'steps.wa.iphone.3': 'Pastga tushing → “Chatni eksport qilish”',
  'steps.wa.iphone.4': '“Mediasiz” ni tanlang va faylni saqlang',
  'steps.wa.android.1': 'Chatni oching',
  'steps.wa.android.2': '⋮ (uch nuqta) ni bosing',
  'steps.wa.android.3': '“Yana” → “Chatni eksport qilish”',
  'steps.wa.android.4': '“Mediasiz” ni tanlang va faylni saqlang',
  'steps.wa.tip':
    '.zip faylni yoki uning ichidagi .txt ni yuklashingiz mumkin — ikkalasi ham ishlaydi.',
  'steps.tg.desktop': 'Telegram Desktop',
  'steps.tg.note':
    'Telegram telefon ilovasi chatlarni eksport qila olmaydi. Telegram Desktop dan foydalaning (Windows, macOS yoki Linux).',
  'steps.tg.1': 'Chatni Telegram Desktop da oching',
  'steps.tg.2': '⋮ (uch nuqta) → “Chat tarixini eksport qilish”',
  'steps.tg.3': 'Rasm, video va boshqa medialardan belgini olib tashlang',
  'steps.tg.4': 'Formatni “Machine-readable JSON” qilib tanlang',
  'steps.tg.5': '“Eksport” ni bosing va result.json ni yuklang',
  'steps.tg.tip':
    'Butun akkauntni eksport qildingizmi? Bu ham boʻladi: chatni tanlashga ruxsat beramiz.',

  'demo.title': 'Chat yoʻqmi? Demoni sinab koʻring',
  'demo.whatsapp': 'WhatsApp, ikki kishi',
  'demo.telegram': 'Telegram guruhi',
  'demo.note': 'Toʻliq oʻylab topilgan chatlar.',
  'demo.banner': 'Demo: oʻylab topilgan chat',

  'features.private.title': '100% maxfiy',
  'features.private.text':
    'Faylingizni oʻz brauzeringiz oʻqiydi. Hech narsa hech qayerga yuklanmaydi. Hatto oflayn ham ishlaydi.',
  'features.fast.title': 'Katta chatmi? Muammo emas.',
  'features.fast.text': 'Yarim million xabar bir necha soniyada, telefon qotmaydi.',
  'features.share.title': 'Storislar uchun',
  'features.share.text':
    'Har bir kartochka 1080×1920 rasm — Instagram, TikTok yoki chatingiz uchun tayyor.',

  'faq.title': 'Savollar',
  'faq.q1': 'Bu rostdan ham xavfsizmi?',
  'faq.a1':
    'Ha. Ilova toʻliq brauzeringizda ishlaydi va uning xavfsizlik siyosati har qanday tarmoq ulanishini taqiqlaydi, shuning uchun chatingiz jismonan hech qayerga yuborilmaydi. Akkaunt, analitika va cookie yoʻq.',
  'faq.q2': 'Nega baʼzi statistikalar gʻalati?',
  'faq.a2':
    'Eksport telefon, til va ilova versiyasiga qarab farq qiladi. Sanalar notoʻgʻri boʻlsa, “Sanalar notoʻgʻrimi?” tugmasini bosing. Media eksportdagi belgilar boʻyicha sanaladi, javob vaqti esa faqat 12 soat ichidagi javoblarni hisobga oladi.',
  'faq.q3': 'Qaysi tillar ishlaydi?',
  'faq.a3':
    'Hisoblash istalgan tilda ishlaydi. Soʻz roʻyxatlari, kulgilar va media belgilari ingliz, rus, oʻzbek, ispan, turk, portugal, nemis, fransuz va arab tillari uchun sozlangan.',
  'faq.q4': 'Fayl qancha katta boʻlishi mumkin?',
  'faq.a4':
    '500 000+ xabarli (50 MB+) chatlar zamonaviy telefon yoki noutbukda bemalol ishlaydi. Juda eski telefonlarga ulkan eksportlar ogʻirlik qilishi mumkin.',
  'faq.q5': 'Guruh chatlari bilan ishlaydimi?',
  'faq.a5':
    'Ha, 50 kishigacha. Eng faol ishtirokchilar diqqat markazida, qolganlari “Boshqalar” ga birlashtiriladi.',

  'footer.tagline': 'Qiziqish uchun yaratilgan. Chatlaringiz sizniki boʻlib qoladi.',
  'footer.noTracking': 'Trekerlar, cookie va serverlar yoʻq.',

  'loading.title': 'Chatingiz oʻqilmoqda…',
  'loading.reading': 'Fayl ochilmoqda',
  'loading.parsing': 'Xabarlar oʻqilmoqda',
  'loading.computing': 'Raqamlar hisoblanmoqda',
  'loading.local': 'Bularning barchasi qurilmangizda bajariladi.',

  'setup.title': 'Hammasi tayyor!',
  'setup.messages': '{n} ta xabar',
  'setup.people': '{n} ishtirokchi',
  'setup.range': 'Qaysi davr uchun?',
  'setup.generate': 'Yakunlarni yaratish',
  'setup.pickChat': 'Eksportda bir nechta chat bor. Bittasini tanlang:',
  'setup.chatMessages': '{n} ta xabar',
  'setup.another': 'Boshqa fayl tanlash',
  'setup.andMore': '+yana {n}',

  'error.title': 'Hmm, boʻlmadi',
  'error.empty': 'Bu fayl boʻsh. Chatni qaytadan eksport qilib koʻring.',
  'error.unrecognized':
    'Faylni aniqlab boʻlmadi. WhatsApp eksportini (.txt yoki .zip) yoki Telegram result.json faylini yuklang.',
  'error.telegram_html':
    'Bu Telegram HTML eksportiga oʻxshaydi. Telegram Desktop da qayta eksport qiling, formatni “Machine-readable JSON” qilib tanlang va result.json ni yuklang.',
  'error.zip_no_chat':
    'Bu ZIP ichida chat fayli yoʻq. _chat.txt (WhatsApp) yoki result.json (Telegram) ni qidiring.',
  'error.corrupted_json':
    'Bu JSON fayl shikastlangan yoki toʻliq emas. Chatni qaytadan eksport qilib koʻring.',
  'error.corrupted_zip': 'Bu ZIP fayl shikastlangan. Chatni qaytadan eksport qilib koʻring.',
  'error.no_messages': 'Bu davrda xabarlar topilmadi. Uzunroq davr yoki boshqa chatni tanlang.',
  'error.too_large':
    'Fayl qurilmangiz xotirasi uchun juda katta. Bitta chatni mediasiz eksport qilib koʻring.',
  'error.unknown':
    'Kutilmagan xatolik yuz berdi. Qaytadan urinib koʻring yoki boshqa eksportdan foydalaning.',
  'error.retry': 'Boshqa fayl tanlash',
  'error.reload': 'Sahifani qayta yuklash',

  'privacyPage.title': 'Maxfiylik, oddiy soʻzlar bilan',
  'privacyPage.lead':
    'Qisqasi: chatingiz qurilmangizdan hech qachon chiqmaydi. Bu nimani anglatadi:',
  'privacyPage.h1': 'Hech narsa yuklanmaydi',
  'privacyPage.p1':
    'Faylni tanlaganingizda uni brauzeringiz bevosita oʻqiydi. Tahlil telefoningiz yoki kompyuteringizdagi shu sahifa ichida bajariladi. Chatingizni qabul qiladigan server yoʻq, chunki umuman server yoʻq: sayt shunchaki statik fayllardan iborat.',
  'privacyPage.h2': 'Buni brauzer kafolatlaydi',
  'privacyPage.p2':
    "Sahifada har qanday tarmoq soʻrovini bloklaydigan qatʼiy xavfsizlik siyosati (CSP) bor (connect-src 'none'). Kimdir xohlasa ham, kod chatingizni hech qayerga yubora olmaydi.",
  'privacyPage.h3': 'Kuzatuv yoʻq',
  'privacyPage.p3':
    'Analitika, cookie, reklama, uchinchi tomon skriptlari va shriftlari yoʻq. Faqat tanlagan tilingiz va mavzungiz brauzeringizning mahalliy xotirasida saqlanadi.',
  'privacyPage.h4': 'Rasmlaringiz — sizning tanlovingiz',
  'privacyPage.p4':
    'Rasmlar qurilmangizda yaratiladi. Ismlarni sir saqlamoqchi boʻlsangiz, ulashishdan oldin “Ismlarni yashirish” ni yoqing. Siz ulashmaguningizcha hech narsa ulashilmaydi.',
  'privacyPage.h5': 'Varaqni yopsangiz — hammasi oʻchadi',
  'privacyPage.p5':
    'Chatingiz faqat shu varaq xotirasida yashaydi. Sahifani yoping yoki yangilang — u yoʻqoladi.',
}
