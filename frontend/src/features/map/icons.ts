import L from 'leaflet'
import type { Market } from '@/api/types'

export const MARKET_COLORS: Record<Market['type'], string> = {
  bazaar: '#111317',
  wholesale: '#ff5a1f',
  warehouse: '#3b5bdb',
}

const cache = new Map<string, L.DivIcon>()

/** Teardrop pin drawn with inline SVG (no image assets) showing the market's active offer count. */
export function marketIcon(type: Market['type'], count: number, selected = false): L.DivIcon {
  const key = `${type}:${count}:${selected ? 1 : 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const c = MARKET_COLORS[type] ?? MARKET_COLORS.bazaar
  const ring = selected ? '#ff5a1f' : '#ffffff'
  const label = count > 99 ? '99+' : String(Math.max(0, Math.floor(count)))
  const scale = selected ? 1.15 : 1
  const w = Math.round(34 * scale), h = Math.round(42 * scale)
  const html =
    `<div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 3px 4px rgba(17,19,23,.35))">` +
    `<svg width="${w}" height="${h}" viewBox="0 0 34 42" aria-hidden="true"><path d="M17 40.5S3.5 26.2 3.5 16a13.5 13.5 0 1 1 27 0c0 10.2-13.5 24.5-13.5 24.5z" fill="${c}" stroke="${ring}" stroke-width="2.4"/></svg>` +
    `<span style="position:absolute;top:${Math.round(9 * scale)}px;left:0;width:${w}px;text-align:center;font:600 ${label.length > 2 ? 9.5 : 11}px/1 'Geist Mono Variable',ui-monospace,monospace;color:#fff">${label}</span>` +
    `</div>`
  const icon = L.divIcon({ html, className: 'bozor-market-pin', iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h + 6] })
  cache.set(key, icon)
  return icon
}

/** Green (cheap) → saffron → red (expensive) for t in [0, 1]. */
export function priceColor(t: number): string {
  const stops = [[22, 132, 91], [229, 161, 58], [217, 87, 87]]
  const x = Math.max(0, Math.min(1, t)) * 2
  const i = Math.min(1, Math.floor(x))
  const f = x - i
  const [a, b] = [stops[i], stops[i + 1]]
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * f))
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`
}
