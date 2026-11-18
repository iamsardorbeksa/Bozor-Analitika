export { formatNumber } from '@/lib/format'

export function shortDateSafe(d: string) {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
}

/** Section anchors used by the nav, the section rail and the footer. */
export const SECTIONS = [
  { id: 'top', key: 'hero' },
  { id: 'market', key: 'snapshot' },
  { id: 'problem', key: 'problem' },
  { id: 'how', key: 'how' },
  { id: 'platform', key: 'platform' },
  { id: 'ai', key: 'ai' },
  { id: 'regions', key: 'regions' },
  { id: 'business', key: 'business' },
  { id: 'insights', key: 'insights' },
  { id: 'faq', key: 'faq' },
] as const
