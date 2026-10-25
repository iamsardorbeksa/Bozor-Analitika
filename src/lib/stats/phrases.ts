/**
 * Configurable "sweet words" counted per person.
 * Add a category or a phrase here and it is picked up by the stats engine automatically.
 * Phrases are matched case-insensitively as whole words (apostrophes normalized to ').
 */
export const PHRASES = {
  sorry: [
    // en
    'sorry',
    'sry',
    'soz',
    'my bad',
    'apologies',
    'i apologize',
    'i apologise',
    // ru
    'прости',
    'простите',
    'извини',
    'извините',
    'сорри',
    'сори',
    'виноват',
    'виновата',
    // uz
    'kechir',
    'kechirasiz',
    'kechirasan',
    'uzr',
    'uzur',
    'кечир',
    'кечирасиз',
    'узр',
    // es / pt / tr / de / fr
    'perdón',
    'perdon',
    'lo siento',
    'perdão',
    'desculpa',
    'desculpe',
    'özür dilerim',
    'pardon',
    'kusura bakma',
    'entschuldigung',
    'tut mir leid',
    'désolé',
    'désolée',
    'desole',
    'je suis désolé',
    'excuse-moi',
    'perdóname',
    // zh
    '对不起',
    '抱歉',
    '不好意思',
    // ar
    'آسف',
    'آسفة',
    'اسف',
    'اسفة',
    'عذرا',
    'عذرا\u064B',
    'سامحني',
    'معلش',
  ],
  thanks: [
    'thanks',
    'thank you',
    'thx',
    'thanx',
    'ty',
    'tysm',
    'thank u',
    'спасибо',
    'спс',
    'благодарю',
    'пасиб',
    'спасибки',
    'rahmat',
    'raxmat',
    'rahmat sizga',
    'tashakkur',
    'рахмат',
    'раҳмат',
    'gracias',
    'obrigado',
    'obrigada',
    'brigado',
    'teşekkürler',
    'teşekkür ederim',
    'sağol',
    'sagol',
    'danke',
    'dankeschön',
    'vielen dank',
    'merci',
    'merci beaucoup',
    'muchas gracias',
    'valeu',
    // zh
    '谢谢',
    '多谢',
    '感谢',
    '谢啦',
    '谢了',
    // ar
    'شكرا',
    'شكرا\u064B',
    'شكر\u064Bا',
    'مشكور',
    'مشكورة',
  ],
  love: [
    'love you',
    'love u',
    'luv u',
    'luv you',
    'ily',
    'i love you',
    'love ya',
    'люблю тебя',
    'люблю',
    'люблю вас',
    'обожаю тебя',
    "seni yaxshi ko'raman",
    'sevaman',
    'seni sevaman',
    'яхши кўраман',
    'севаман',
    'te quiero',
    'te amo',
    'seni seviyorum',
    'eu te amo',
    'ich liebe dich',
    'hab dich lieb',
    'hdl',
    "je t'aime",
    'je vous aime',
    'te amo muito',
    // zh
    '我爱你',
    '爱你',
    // ar
    'أحبك',
    'احبك',
    'بحبك',
    'أحبكم',
    'بحبكم',
  ],
  ok: [
    'ok',
    'okay',
    'okey',
    'oki',
    'okie',
    'okk',
    'kk',
    'k',
    'alright',
    'ок',
    'окей',
    'оки',
    'ладно',
    'хорошо',
    'лан',
    "xo'p",
    'xop',
    'xoʻp',
    'mayli',
    "bo'pti",
    'bopti',
    'хўп',
    'майли',
    'vale',
    'dale',
    'tamam',
    'tmm',
    'beleza',
    'blz',
    "d'accord",
    'alles klar',
    'passt',
    // zh
    '好的',
    '好吧',
    '行吧',
    '嗯嗯',
    // ar
    'تمام',
    'طيب',
    'اوكي',
    'أوكي',
    'ماشي',
  ],
} as const satisfies Record<string, readonly string[]>

export type PhraseCategory = keyof typeof PHRASES
export const PHRASE_CATEGORIES = Object.keys(PHRASES) as PhraseCategory[]

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u

/**
 * One regex per category, longest phrases first so "thank you" wins over "ty".
 * Phrases are matched as whole words, except Chinese/Japanese ones: those scripts
 * have no spaces, so "谢谢你" must still count as "谢谢".
 */
export const PHRASE_REGEXES: Record<PhraseCategory, RegExp> = Object.fromEntries(
  PHRASE_CATEGORIES.map((cat) => {
    const phrases = [...PHRASES[cat]]
      .map((p) => p.toLowerCase().replace(/[‘’ʻʼ]/g, "'"))
      .sort((a, b) => b.length - a.length)
    const words = phrases
      .filter((p) => !CJK_RE.test(p))
      .map(escapeRe)
      .join('|')
    const cjk = phrases
      .filter((p) => CJK_RE.test(p))
      .map(escapeRe)
      .join('|')
    const bounded = `(?<![\\p{L}\\p{N}'])(?:${words})(?![\\p{L}\\p{N}])`
    return [cat, new RegExp(cjk ? `${bounded}|${cjk}` : bounded, 'gu')]
  }),
) as Record<PhraseCategory, RegExp>
