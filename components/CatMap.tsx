'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import StatusBadge from './StatusBadge'
import type { Database } from '@/lib/database.types'

type Cat = Database['public']['Tables']['cats']['Row']

// Fix default Leaflet icon broken by Webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const statusIcon: Record<string, string> = {
  spotted: '🟡',
  needs_foster: '🔵',
  adopted: '🟢',
}

interface Props {
  cats: Cat[]
  center?: [number, number]
  zoom?: number
  onPinSelect?: (lat: number, lng: number) => void
  pinMode?: boolean
}

export default function CatMap({ cats, center = [32.0853, 34.7818], zoom = 13, onPinSelect, pinMode = false }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pinMode && <PinHandler onPinSelect={onPinSelect!} />}
      {cats.map((cat) => (
        <Marker key={cat.id} position={[cat.lat, cat.lng]}>
          <Popup>
            <div className="text-sm min-w-[160px]">
              <div className="font-semibold mb-1">
                {statusIcon[cat.status]} {cat.name ?? 'Unknown cat'}
              </div>
              <p className="text-gray-600 mb-2 line-clamp-2">{cat.description}</p>
              <StatusBadge status={cat.status} />
              <div className="mt-2">
                <Link href={`/cats/${cat.id}`} className="text-orange-500 underline text-xs">
                  View details →
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

function PinHandler({ onPinSelect }: { onPinSelect: (lat: number, lng: number) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMapEvents } = require('react-leaflet')
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onPinSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}
