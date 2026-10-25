import type { AwardTexts, Dict } from './en'

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
  'features.title': 'Nega hammaga yoqadi',
  'features.langs.title': 'Sizning tilingizda',
  'features.langs.text':
    '9 til, jumladan arab va xitoy tillari. Har birida kulgi va “rahmat” ni ham taniydi.',
  'features.groups.title': 'Ikki kishi yoki guruh',
  'features.groups.text': 'Shaxsiy chatlar va 50 kishigacha boʻlgan guruhlar uchun.',
  'features.free.title': 'Bepul, roʻyxatdan oʻtmasdan',
  'features.free.text':
    'Akkaunt ham, ilova oʻrnatish ham shart emas. Xohlasangiz, bosh ekranga qoʻshib qoʻying.',

  // ---- "what you'll discover"
  'discover.title': 'Nimalarni bilib olasiz',
  'discover.subtitle':
    'Chatingiz shu vaqtgacha yozib kelgan hikoya — 12+ ta varaqlanadigan kartochkada.',
  'discover.total.title': 'Umumiy hisob',
  'discover.total.text': 'Har bir xabar, har bir soʻz va yozishdan toʻxtay olmagan oʻsha kuningiz.',
  'discover.who.title': 'Kim koʻproq yozadi',
  'discover.who.text': 'Aniq nisbat va kim butun boshli insho yozadi.',
  'discover.rush.title': 'Qizgʻin soatingiz',
  'discover.rush.text': 'Boyqushmisiz yoki erta turuvchi? Eng faol soatingiz va hafta kuningiz.',
  'discover.streak.title': 'Eng uzun seriya',
  'discover.streak.text': 'Suhbatni necha kun ketma-ket uzmagansiz.',
  'discover.silence.title': 'Katta jimlik',
  'discover.silence.text': 'Eng uzun tanaffus va jimlikni nihoyat kim buzdi.',
  'discover.reply.title': 'Javob tezligi',
  'discover.reply.text': 'Kim soniyalarda javob beradi, kim esa “oʻqildi” holatida qoldiradi.',
  'discover.starter.title': 'Kim birinchi yozadi',
  'discover.starter.text': 'Suhbatni kim boshlaydi va oxirgi soʻz doim kimda qoladi.',
  'discover.laugh.title': 'Kulgi-metr',
  'discover.laugh.text': 'Har bir “xaxa”, “hahaha” va 😂 hisoblanadi. Eng yaxshi tomoshabin kim?',
  'discover.words.title': 'Top soʻzlar va emojilar',
  'discover.words.text': 'Sizni tasvirlaydigan soʻzlar va emojilar.',

  // ---- awards showcase
  'showcase.title': 'Hammaga mukofot bor',
  'showcase.subtitle':
    '34 ta qiziqarli unvon — qanday yozishishingizga qarab beriladi. Doim kulgili, hech qachon haqoratli emas.',
  'showcase.example': 'Namuna',

  // ---- use cases
  'uses.title': 'Kimlar uchun ideal',
  'uses.couples.title': 'Juftliklar',
  'uses.couples.text': 'Yubiley uchun syurpriz: sevgi hikoyangiz raqamlarda.',
  'uses.friends.title': 'Eng yaqin doʻstlar',
  'uses.friends.text': 'Kim tezroq javob berishini bir yoʻla aniqlab oling.',
  'uses.family.title': 'Oilaviy guruhlar',
  'uses.family.text': 'Kim eng koʻp “Xayrli tong” yuborishini bilib oling.',
  'uses.teams.title': 'Jamoalar va hamjamiyatlar',
  'uses.teams.text': 'Guruh chati uchun quvnoq yil yakunlari.',
  'uses.moments.title': 'Muhim lahzalar',
  'uses.moments.text': 'Tugʻilgan kunlar, Yangi yil, bitiruv: tayyor “birga oʻtgan yilimiz” posti.',

  // ---- closing call to action
  'cta.title': 'Hikoyangizni koʻrishga tayyormisiz?',
  'cta.text': 'Bor-yoʻgʻi bir daqiqa. Chatingiz qurilmangizdan chiqmaydi.',

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

export const uzAwards: AwardTexts = {
  'midnight-philosopher': {
    title: 'Yarim tun faylasufi',
    description:
      'Yarim tundan soat 5 gacha {count} ta xabar. Chuqur fikrlar qorongʻulikni yaxshi koʻradi.',
  },
  'voice-note-villain': {
    title: 'Ovozli xabarlar ustasi',
    description: '{count} ta ovozli xabar. Podkast qachon chiqadi?',
  },
  'seen-at': {
    title: 'Koʻrildi: 14:14',
    description: 'Oʻrtacha javob vaqti: {duration}. Sabr tagi — sariq oltin.',
  },
  'speed-demon': {
    title: 'Chaqmoq',
    description: '{duration} ichida javob beradi. Barmoqlaringiz charchamadimi?',
  },
  'essay-writer': {
    title: 'Insho ustasi',
    description: 'Har bir xabarda oʻrtacha {count} soʻz. Ikkinchi bob qachon?',
  },
  'hype-machine': {
    title: 'Hayajon mashinasi',
    description: '{count} ta undov belgisi va emoji. Sof energiya!!!',
  },
  'ghost-mode': {
    title: 'Arvoh rejimi',
    description: 'Bir marta {duration} davomida gʻoyib boʻldi. Qoʻrqinchli.',
  },
  'conversation-starter': {
    title: 'Suhbat boshlovchisi',
    description: 'Barcha suhbatlarning {pct} qismini boshlagan. Chatning budilnigi.',
  },
  'topic-killer': {
    title: 'Mavzu qotili',
    description: '{count} marta uzoq jimlikdan oldin oxirgi soʻzni aytgan. Mikrofon tashlandi.',
  },
  'chief-laughing-officer': {
    title: 'Bosh kulgi direktori',
    description: '{count} marta kulgi. Eng zoʻr tomoshabin.',
  },
  'sticker-mafia': {
    title: 'Stiker mafiyasi',
    description: '{count} ta stiker. Soʻzlar shart emas.',
  },
  'question-detective': {
    title: 'Savol belgisi detektivi',
    description: '{count} ta savol. Qiziquvchanlik — maksimumda.',
  },
  'sorry-champion': {
    title: 'Kechirim chempioni',
    description: '{count} marta kechirim soʻragan. Ehtimol, sababsiz ham.',
  },
  'gratitude-guru': {
    title: 'Minnatdorchilik ustozi',
    description: '{count} marta rahmat aytgan. Odobi aʼlo.',
  },
  'love-letter': {
    title: 'Sevgi maktubi',
    description: '{count} marta “yaxshi koʻraman”. Shirinlik darajasi: kritik.',
  },
  'certified-ok': {
    title: 'Rasmiy “ok”chi',
    description: '{count} marta “ok”. Qisqa. Sirli. Ok.',
  },
  'triple-texter': {
    title: 'Ketma-ket yozuvchi',
    description: '{count} marta ketma-ket 3+ xabar. Nega bir marta aytish kerak?',
  },
  'early-bird': {
    title: 'Erta turar',
    description: 'Soat 5 dan 9 gacha {count} ta xabar. Avval chat, keyin kofe.',
  },
  'weekend-warrior': {
    title: 'Dam olish jangchisi',
    description: 'Xabarlarining {pct} qismi dam olish kunlarida. Shanba qahramoni.',
  },
  'emoji-artist': {
    title: 'Emoji rassomi',
    description: '{count} xil emoji. Haqiqiy vizual hikoyachi.',
  },
  paparazzi: {
    title: 'Paparatsi',
    description: '{count} ta rasm va video. Rasmsiz ishonmaymiz.',
  },
  'master-of-brevity': {
    title: 'Qisqalik ustasi',
    description: 'Har xabarda atigi {count} soʻz. Harflarni tejash kerak.',
  },
  'main-character': {
    title: 'Bosh qahramon',
    description: 'Barcha xabarlarning {pct} qismi. Bu chat — shaxsiy shou.',
  },
  'undo-button': {
    title: '“Bekor qilish” tugmasi',
    description: '{count} ta xabar oʻchirilgan. Hech qachon bilmaymiz…',
  },
  icebreaker: {
    title: 'Muzyorar',
    description: 'Eng uzun jimlikni ({duration}) buzgan. Haqiqiy qahramon.',
  },
  'office-hours-hero': {
    title: 'Ish vaqti qahramoni',
    description: 'Ish kunlari 9 dan 17 gacha {count} ta xabar. Ishlayapmiz-a?',
  },
  'walking-dictionary': {
    title: 'Yuruvchi lugʻat',
    description: '{count} xil soʻz ishlatgan. Soʻz boyligi zoʻr.',
  },
  'caps-lock': {
    title: 'CAPS LOCK ISHQIBOZI',
    description: '{count} TA XABAR KATTA HARFLARDA. ESHITYAPMIZ.',
  },
  'link-librarian': {
    title: 'Havolalar kutubxonachisi',
    description: '{count} ta havola. Hammaga uy vazifasi.',
  },
  'reply-master': {
    title: 'Javob ustasi',
    description: '{count} marta iqtibos bilan javob. Kontekst — hammasi.',
  },
  'forwarding-department': {
    title: 'Yoʻnaltirish boʻlimi',
    description: '{count} ta yoʻnaltirilgan xabar. Chatning shaxsiy yangiliklar lentasi.',
  },
  'loyal-regular': {
    title: 'Sodiq hamroh',
    description: '{count} ta xabar — doimiy iliqlik. Busiz chat boshqacha boʻlardi.',
  },
  'quiet-legend': {
    title: 'Sokin afsona',
    description: 'Kam yozadi, lekin {count} ta xabarning har biri oltin.',
  },
  'prime-time': {
    title: 'Eng qizgʻin vaqt yulduzi',
    description: 'Eng faol vaqti — taxminan {hour}:00. Soatlarni toʻgʻrilang.',
  },
}
