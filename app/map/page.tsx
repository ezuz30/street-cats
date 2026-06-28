'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import { haversineKm, formatDistance } from '@/lib/geo'
import type { Database, CatStatus } from '@/lib/database.types'

type Cat = Database['public']['Tables']['cats']['Row']
type LatLng = { lat: number; lng: number }

const CatMap = dynamic(() => import('@/components/CatMap'), { ssr: false })

const STATUS_FILTERS: { label: string; value: CatStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🟡 Spotted', value: 'spotted' },
  { label: '🔵 Needs Foster', value: 'needs_foster' },
  { label: '🟢 Adopted', value: 'adopted' },
]

export default function MapPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [filter, setFilter] = useState<CatStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [userLoc, setUserLoc] = useState<LatLng | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  useEffect(() => {
    supabase
      .from('cats')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCats(data ?? [])
        setLoading(false)
      })
  }, [])

  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      setLocError('Your browser does not support location.')
      return
    }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocError('Could not get your location — please allow location access.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const filtered = useMemo(
    () => (filter === 'all' ? cats : cats.filter((c) => c.status === filter)),
    [cats, filter]
  )

  // Attach distance + sort nearest-first when we know where the user is.
  const listed = useMemo(() => {
    const withDist = filtered.map((c) => ({
      cat: c,
      dist: userLoc ? haversineKm(userLoc.lat, userLoc.lng, c.lat, c.lng) : null,
    }))
    if (userLoc) withDist.sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
    return withDist
  }, [filtered, userLoc])

  return (
    <div className="flex flex-col flex-1">
      {/* Filter / action bar */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1 font-medium">Filter:</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-sm px-3 py-1 rounded-full transition-colors ${
              filter === f.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={locateMe}
          disabled={locating}
          className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
        >
          {locating ? '📍 Locating…' : userLoc ? '📍 Centered on you' : '📍 Cats near me'}
        </button>
        <Link
          href="/upload"
          className="ml-auto bg-orange-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
        >
          + Report a Cat
        </Link>
      </div>

      {locError && (
        <div className="bg-red-50 text-red-600 text-sm px-6 py-2 border-b">{locError}</div>
      )}

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 skeleton" />
          ) : (
            <CatMap cats={filtered} userLocation={userLoc} flyTo={userLoc} />
          )}
        </div>

        {/* Sidebar list (hidden on small screens) */}
        <div className="hidden md:flex w-72 bg-white border-l overflow-y-auto flex-col">
          <div className="p-3 border-b text-sm font-semibold text-gray-600 flex items-center justify-between">
            <span>{userLoc ? 'Nearest cats' : 'Recent sightings'}</span>
            <span className="text-gray-400 font-normal">{listed.length}</span>
          </div>

          {loading ? (
            <div className="p-3 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              ))}
            </div>
          ) : listed.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">No cats found.</div>
          ) : (
            listed.map(({ cat, dist }) => (
              <Link
                key={cat.id}
                href={`/cats/${cat.id}`}
                className="flex items-start gap-3 p-3 border-b hover:bg-orange-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm truncate">{cat.name ?? 'Unknown cat'}</div>
                    {dist !== null && (
                      <span className="text-[11px] text-blue-600 font-medium whitespace-nowrap">
                        {formatDistance(dist)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{cat.description}</p>
                  <div className="mt-1">
                    <StatusBadge status={cat.status} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
