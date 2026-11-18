import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import * as React from 'react'
import type { RegionalRow } from '@/api/types'
import { formatNumber, formatPct, ln } from '@/lib/format'

function Fly({ row }: { row?: RegionalRow }) {
  const map = useMap()
  React.useEffect(() => {
    if (row) map.flyTo([row.lat, row.lng], 7, { duration: 0.8 })
    else map.flyTo([41.0, 66.2], 5.6, { duration: 0.8 })
  }, [row, map])
  return null
}

const colorFor = (d: number | null) => (d == null ? '#5d6370' : d < -3 ? '#12855a' : d > 3 ? '#c0352b' : '#b45f00')

export default function RegionMap({ rows, selected, onSelect }: { rows: RegionalRow[]; selected?: string; onSelect: (id: string) => void }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  const sel = rows.find((r) => r.region_id === selected)
  return (
    <MapContainer center={[41.0, 66.2]} zoom={5.6} zoomSnap={0.2} scrollWheelZoom={false} className="map-muted size-full" attributionControl>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <Fly row={sel} />
      {rows.map((r) => {
        const active = r.region_id === selected
        return (
          <CircleMarker key={r.region_id} center={[r.lat, r.lng]} radius={10 + (r.count / max) * 16}
            pathOptions={{ color: active ? '#111317' : '#fff', weight: active ? 3 : 2, fillColor: colorFor(r.diff_vs_national_pct), fillOpacity: active ? 0.95 : 0.75 }}
            eventHandlers={{ click: () => onSelect(r.region_id) }}>
            <Tooltip direction="top" offset={[0, -8]}>
              <b>{ln(r, 'region_name')}</b> · {formatNumber(r.avg)} · {formatPct(r.diff_vs_national_pct)}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
