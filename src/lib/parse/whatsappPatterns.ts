import type { MessageKind } from '../types'
import { normalizeApostrophes } from './unicode'

/*
 * Language-specific strings WhatsApp writes into exports.
 * Matching is done on lower-cased, apostrophe-normalized text.
 */

/** Exact texts of deleted-message placeholders. */
const DELETED_TEXTS = [
  // English
  'this message was deleted',
  'you deleted this message',
  'this message was deleted by admin',
  // Russian
  'это сообщение удалено',
  'данное сообщение удалено',
  'вы удалили это сообщение',
  'вы удалили данное сообщение',
  // Uzbek (Latin & Cyrillic)
  "bu xabar o'chirildi",
  "siz bu xabarni o'chirdingiz",
  'бу хабар ўчирилди',
  'сиз бу хабарни ўчирдингиз',
  // Spanish
  'se eliminó este mensaje',
  'eliminaste este mensaje',
  'este mensaje fue eliminado',
  // Turkish
  'bu mesaj silindi',
  'bu mesajı sildiniz',
  // Portuguese
  'esta mensagem foi apagada',
  'mensagem apagada',
  'você apagou esta mensagem',
  // German
  'diese nachricht wurde gelöscht',
  'du hast diese nachricht gelöscht',
  // French
  'ce message a été supprimé',
  'vous avez supprimé ce message',
  // Arabic
  'تم حذف هذه الرسالة',
  'لقد حذفت هذه الرسالة',
  'حذفت هذه الرسالة',
  // Chinese
  '此消息已删除',
  '此消息已被删除',
  '你删除了此消息',
  '您删除了此消息',
].map((s) => s.normalize('NFC'))

const DELETED_SET = new Set(DELETED_TEXTS)

/** "<This message was edited>" style suffixes that should be stripped from message text. */
const EDITED_SUFFIX_RE =
  /\s*<(?:this message was edited|сообщение (?:было )?изменено|изменено|xabar tahrirlandi|tahrirlangan|se editó este mensaje|editado|bu mesaj düzenlendi|düzenlendi|mensagem editada|diese nachricht wurde bearbeitet|bearbeitet|ce message a été modifié|modifié|تم تعديل هذه الرسالة|تم التعديل|此消息已编辑|已编辑)>\s*$/i

/** Words that, in a short message, indicate a media placeholder ("image omitted", "<Без медиафайлов>"...). */
const OMITTED_RE =
  /(omitted|omitid[oa]|ocultad[oa]|oculta|weggelassen|ausgeschlossen|absente?s?|omise?s?|отсутству|без медиа|dahil edilmedi|استبعاد|غير مضمن|tashlab ketildi|qoldirildi|o'tkazib yuborildi|kiritilmagan|mediasiz|yo'q|file attached|файл прикреплен|файл прикреплён|archivo adjunto|arquivo anexado|dosya ekli|datei angehängt|fichier joint|fayl biriktirilgan|attached:|已省略|已忽略|省略影音|ملف مرفق)/i

const STICKER_RE = /(sticker|стикер|stiker|çıkartma|figurinha|ملصق|贴图|贴纸|STK-|\.webp)/i
const VOICE_RE =
  /(audio|аудио|ovoz|ses |sesli|áudio|صوت|voice|голосов|音频|语音|PTT-|\.opus|\.m4a|\.ogg)/i
/** Android "<Media omitted>" and its translations are always wrapped in angle brackets. */
const BRACKETED_RE = /^<[^<>]{3,60}>$/

/**
 * System messages ("X joined using this group's invite link", encryption notice...).
 * Tested against the *whole* content after the timestamp.
 */
const SYSTEM_RE = new RegExp(
  [
    // encryption & security
    'end-to-end encrypted',
    'сквозным шифрованием',
    'cifrados de extremo a extremo',
    'uçtan uca şifreli',
    'criptografia de ponta a ponta',
    'ende-zu-ende-verschlüsselt',
    'chiffrés de bout en bout',
    'مشفرة تمام\u064Bا',
    'mustahkam shifrlangan',
    'uchdan-uchga shifrlangan',
    'security code (?:changed|with)',
    'код безопасности',
    'xavfsizlik kodi',
    // groups
    'created (?:the )?group',
    'создал\\(а\\)? группу',
    'создала? группу',
    'guruh yaratdi',
    'creó el grupo',
    'grubunu oluşturdu',
    'criou o grupo',
    'hat die gruppe .* erstellt',
    'a créé le groupe',
    'joined using (?:this|a) group',
    'присоединил(?:ся|ась|ся\\(-ась\\)) по ссылке',
    'changed (?:the|this group|their)',
    'изменил\\(а\\)?',
    'изменила? (?:тему|описание|изображение|значок|номер)',
    "o'zgartirdi",
    'cambió (?:el|la|su)',
    'değiştirdi',
    'mudou (?:o|a|seu)',
    'hat (?:den|die|das) .* geändert',
    'a modifié',
    'added ',
    ' added$',
    'добавил\\(а\\)?',
    'добавила? ',
    "qo'shdi",
    'añadió',
    'ekledi',
    'adicionou',
    'hat .* hinzugefügt',
    'a ajouté',
    ' left$',
    'вышел\\(-ла\\)?',
    'вышла?$',
    'guruhni tark etdi',
    'salió del grupo',
    '^.* salió$',
    'ayrıldı',
    'saiu$',
    'hat die gruppe verlassen',
    'est parti',
    'removed ',
    'удалил\\(а\\)? ',
    'chiqarib yubordi',
    'eliminó a',
    'çıkardı',
    'removeu',
    'hat .* entfernt',
    'a retiré',
    "you're now an admin",
    'теперь вы администратор',
    'now an admin',
    'pinned a message',
    'закрепил\\(а\\)? сообщение',
    'turned (?:on|off) disappearing messages',
    'disappearing messages',
    'исчезающие сообщения',
    'this chat is with a business account',
    'waiting for this message',
    'ожидание сообщения',
    'missed (?:voice|video) call',
    'пропущенный (?:аудио|видео)?звонок',
    'пропущенный (?:голосовой )?звонок',
    'messages to this group are now secured',
    'is a contact',
    'blocked this contact',
    'unblocked this contact',
    'заблокировали этот контакт',
    // Chinese
    '端到端加密',
    '安全代码已更改',
    '创建了群组',
    '创建群组',
    '加入了',
    '通过邀请链接加入',
    '已添加',
    '添加了',
    '退出了',
    '已退出',
    '移除了',
    '更改了群组',
    '更改了主题',
    '更改了此群组',
    '现在是管理员',
    '未接语音通话',
    '未接视频通话',
    // Arabic group events
    'أنشأ المجموعة',
    'أنشأت المجموعة',
    'أضاف',
    'أضافت',
    'غادر',
    'غادرت',
    'انضم',
    'انضمت',
    'غي\u0651ر',
    'غيرت',
    'مكالمة صوتية فائتة',
    'مكالمة فيديو فائتة',
  ].join('|'),
  'i',
)

/** Texts that are system notices even though they appear with a "Name:" prefix (iOS exports). */
const SYSTEM_TEXT_RE = new RegExp(
  [
    '^messages and calls are end-to-end encrypted',
    '^messages to this group are now secured',
    '^сообщения и звонки защищены',
    "^xabarlar va qo'ng'iroqlar",
    '^los mensajes y las llamadas',
    '^mesajlar ve aramalar',
    '^as mensagens e as chamadas',
    '^nachrichten und anrufe sind',
    '^les messages et les appels',
    '^الرسائل والمكالمات',
    '^消息和通话',
    '^.{0,40}端到端加密',
    '^your security code with',
    '^.{0,40} created (?:the )?group',
    '^.{0,40} added ',
    '^you (?:created|added|removed|changed|joined|left|were added)',
    '^.{0,40} changed (?:the subject|this group|the group|their phone)',
    '^missed (?:voice|video) call',
    '^this message was deleted by admin$',
    '^.{0,40} joined using',
    '^.{0,40} turned (?:on|off) disappearing',
    '^.{0,40} pinned a message',
    '^null$',
  ].join('|'),
  'i',
)

export function isSystemContent(content: string): boolean {
  return SYSTEM_RE.test(content)
}

export function isSystemText(text: string): boolean {
  return SYSTEM_TEXT_RE.test(text.trim())
}

export function stripEditedMarker(text: string): string {
  return text.replace(EDITED_SUFFIX_RE, '')
}

/** Classify a WhatsApp message text into a kind. */
export function classifyWhatsAppText(raw: string): MessageKind {
  const text = raw.trim()
  if (text.length === 0) return 'text'
  if (text.length > 120) return 'text'
  const norm = normalizeApostrophes(text).toLowerCase().normalize('NFC')
  if (DELETED_SET.has(norm) || DELETED_SET.has(norm.replace(/[.!]$/, ''))) return 'deleted'
  const bracketed = BRACKETED_RE.test(text)
  if (bracketed || OMITTED_RE.test(norm)) {
    // Guard against normal sentences that happen to contain a keyword:
    // placeholders are short and have very few words.
    const words = norm.split(/\s+/).length
    if (!bracketed && words > 6) return 'text'
    if (STICKER_RE.test(text)) return 'sticker'
    if (VOICE_RE.test(text)) return 'voice'
    return 'media'
  }
  return 'text'
}
