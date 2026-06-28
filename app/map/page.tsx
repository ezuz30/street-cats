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

export default function MapPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [filter, setFilter] = useState<CatStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

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

  const filtered = filter === 'all' ? cats : cats.filter((c) => c.status === filter)

  return (
    <div className="flex flex-col flex-1">
      {/* Filter bar */}
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
        <Link
          href="/upload"
          className="ml-auto bg-orange-500 text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-orange-600 transition-colors"
        >
          + Report a Cat
        </Link>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading map…</div>
          ) : (
            <CatMap cats={filtered} />
          )}
        </div>

        {/* Sidebar list (hidden on small screens) */}
        <div className="hidden md:flex w-72 bg-white border-l overflow-y-auto flex-col">
          <div className="p-3 border-b text-sm font-semibold text-gray-600 flex items-center justify-between">
            <span>Recent sightings</span>
            <span className="text-gray-400 font-normal">{filtered.length}</span>
          </div>
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
