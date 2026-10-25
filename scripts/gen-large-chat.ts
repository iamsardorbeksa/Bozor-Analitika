/**
 * Generate large fake chats for manual testing:
 *   npm run gen:chat -- 500000
 * Writes tmp/large-whatsapp.txt and tmp/large-telegram.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { generateTelegramJson, generateWhatsAppText } from '../tests/helpers/fakeChat'

const count = Number(process.argv[2] ?? 200_000)
mkdirSync('tmp', { recursive: true })
const wa = generateWhatsAppText(count, 2)
writeFileSync('tmp/large-whatsapp.txt', wa)
const tg = generateTelegramJson(count, 6)
writeFileSync('tmp/large-telegram.json', tg)
console.log(
  `Wrote ${count.toLocaleString()} messages: tmp/large-whatsapp.txt (${(wa.length / 1e6).toFixed(1)} MB), tmp/large-telegram.json (${(tg.length / 1e6).toFixed(1)} MB)`,
)
