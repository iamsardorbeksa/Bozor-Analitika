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
    'merci',
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
    "je t'aime",
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
    "d'accord",
  ],
} as const satisfies Record<string, readonly string[]>

export type PhraseCategory = keyof typeof PHRASES
export const PHRASE_CATEGORIES = Object.keys(PHRASES) as PhraseCategory[]

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** One regex per category, longest phrases first so "thank you" wins over "ty". */
export const PHRASE_REGEXES: Record<PhraseCategory, RegExp> = Object.fromEntries(
  PHRASE_CATEGORIES.map((cat) => {
    const alts = [...PHRASES[cat]]
      .map((p) => p.toLowerCase().replace(/[‘’ʻʼ]/g, "'"))
      .sort((a, b) => b.length - a.length)
      .map(escapeRe)
      .join('|')
    return [cat, new RegExp(`(?<![\\p{L}\\p{N}'])(?:${alts})(?![\\p{L}\\p{N}])`, 'gu')]
  }),
) as Record<PhraseCategory, RegExp>
