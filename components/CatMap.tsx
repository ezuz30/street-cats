'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import StatusBadge from './StatusBadge'
import type { Database } from '@/lib/database.types'

type Cat = Database['public']['Tables']['cats']['Row']

const STATUS_COLOR: Record<string, string> = {
  spotted: '#f59e0b',      // amber
  needs_foster: '#3b82f6', // blue
  adopted: '#10b981',      // green
}

// A clean teardrop pin, colored by status, with a cat face inside.
function catIcon(status: string) {
  const color = STATUS_COLOR[status] ?? '#f59e0b'
  return L.divIcon({
    className: 'cat-pin',
    html: `
      <div style="
        background:${color};
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2.5px solid #fff;
        box-shadow:0 3px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:15px;line-height:1;">🐱</span>
      </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  })
}

// Distinct marker used while the reporter is picking a location.
const selectedPinIcon = L.divIcon({
  className: 'selected-pin',
  html: `
    <div style="
      background:#ea580c;
      width:34px;height:34px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid #fff;
      box-shadow:0 3px 10px rgba(234,88,12,0.5);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">📍</span>
    </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

// "You are here" blue dot with a soft halo.
const youAreHereIcon = L.divIcon({
  className: 'you-are-here',
  html: `
    <div style="
      width:16px;height:16px;border-radius:50%;
      background:#2563eb;border:3px solid #fff;
      box-shadow:0 0 0 5px rgba(37,99,235,0.25);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

interface Props {
  cats: Cat[]
  center?: [number, number]
  zoom?: number
  onPinSelect?: (lat: number, lng: number) => void
  pinMode?: boolean
  selectedPin?: { lat: number; lng: number } | null
  userLocation?: { lat: number; lng: number } | null
  flyTo?: { lat: number; lng: number } | null
}

export default function CatMap({
  cats,
  center = [32.0853, 34.7818],
  zoom = 13,
  onPinSelect,
  pinMode = false,
  selectedPin = null,
  userLocation = null,
  flyTo = null,
}: Props) {
  return (
    <MapContainer center={center} zoom={zoom} className="w-full h-full" style={{ zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        detectRetina
        maxZoom={20}
      />
      {pinMode && <PinHandler onPinSelect={onPinSelect!} />}
      <Recenter point={flyTo} />
      {userLocation && <Marker position={[userLocation.lat, userLocation.lng]} icon={youAreHereIcon} />}
      {selectedPin && <Marker position={[selectedPin.lat, selectedPin.lng]} icon={selectedPinIcon} />}
      {cats.map((cat) => (
        <Marker key={cat.id} position={[cat.lat, cat.lng]} icon={catIcon(cat.status)}>
          <Popup>
            <div className="text-sm min-w-[160px]">
              <div className="font-semibold mb-1">{cat.name ?? 'Unknown cat'}</div>
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

// Smoothly recenters the map when `point` changes (used for "near me" and pinning).
function Recenter({ point }: { point: { lat: number; lng: number } | null | undefined }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMap } = require('react-leaflet')
  const map = useMap()
  useEffect(() => {
    if (point) map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 15), { duration: 1 })
  }, [point?.lat, point?.lng, map]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
