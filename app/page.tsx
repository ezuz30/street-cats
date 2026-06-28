'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import type { Database, CatStatus } from '@/lib/database.types'

type Cat = Database['public']['Tables']['cats']['Row']

const CatMap = dynamic(() => import('@/components/CatMap'), { ssr: false })

const STATUS_FILTERS: { label: string; value: CatStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: '🟡 Spotted', value: 'spotted' },
  { label: '🔵 Needs Foster', value: 'needs_foster' },
  { label: '🟢 Adopted', value: 'adopted' },
]

export default function HomePage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [filter, setFilter] = useState<CatStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const query = supabase.from('cats').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') query.eq('status', filter)
    query.then(({ data }) => {
      setCats(data ?? [])
      setLoading(false)
    })
  }, [filter])

  const filtered = filter === 'all' ? cats : cats.filter((c) => c.status === filter)

  return (
    <div className="flex flex-col flex-1">
      {/* Hero banner */}
      <div className="bg-orange-500 text-white px-6 py-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Help Street Cats Find a Home</h1>
        <p className="text-orange-100 mb-4 max-w-xl mx-auto">
          Spot a cat near you, take a photo, pin its location — and help it get adopted.
        </p>
        <Link
          href="/upload"
          className="inline-block bg-white text-orange-500 font-semibold px-6 py-2 rounded-full hover:bg-orange-50 transition-colors"
        >
          + Report a Cat
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500 mr-1">Filter:</span>
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
        <span className="ml-auto text-sm text-gray-400">{filtered.length} cats</span>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading map…</div>
          ) : (
            <CatMap cats={filtered} />
          )}
        </div>

        {/* Sidebar list */}
        <div className="w-72 bg-white border-l overflow-y-auto flex flex-col">
          <div className="p-3 border-b text-sm font-semibold text-gray-600">Recent sightings</div>
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-400 text-center">No cats found.</div>
          ) : (
            filtered.map((cat) => (
              <Link
                key={cat.id}
                href={`/cats/${cat.id}`}
                className="flex items-start gap-3 p-3 border-b hover:bg-orange-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{cat.name ?? 'Unknown cat'}</div>
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
