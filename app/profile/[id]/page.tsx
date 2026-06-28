'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ScoutBadge from '@/components/ScoutBadge'
import StatusBadge from '@/components/StatusBadge'
import { getBadgeTier } from '@/lib/database.types'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Sighting = Database['public']['Tables']['sightings']['Row'] & { cats: { id: string; name: string | null; status: string } | null }

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [adoptedCount, setAdoptedCount] = useState(0)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => setProfile(data))
    supabase
      .from('sightings')
      .select('*, cats(id, name, status)')
      .eq('photographer_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as Sighting[]
        setSightings(rows)
        setAdoptedCount(rows.filter((s) => s.cats?.status === 'adopted').length)
      })
  }, [id])

  if (!profile) return <div className="p-8 text-gray-400">Loading…</div>

  const tier = getBadgeTier(profile.scout_score)
  const nextThreshold: Record<string, number | null> = {
    'Newcomer': 10,
    'Scout': 30,
    'Silver Scout': 60,
    'Gold Scout': null,
  }
  const next = nextThreshold[tier]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 w-full">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border p-6 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl">
          🐾
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">{profile.username}</h1>
          <div className="mt-1">
            <ScoutBadge score={profile.scout_score} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-orange-500">{adoptedCount}</div>
          <div className="text-xs text-gray-500">cats adopted</div>
        </div>
      </div>

      {/* Score progress */}
      <div className="bg-white rounded-2xl border p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Scout Score</span>
          <span className="text-lg font-bold text-orange-500">{profile.scout_score} pts</span>
        </div>
        {next !== null && (
          <>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div
                className="bg-orange-400 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (profile.scout_score / next) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{next - profile.scout_score} pts until next badge</p>
          </>
        )}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { tier: 'Newcomer', pts: 0, emoji: '🐾' },
            { tier: 'Scout', pts: 10, emoji: '🔍' },
            { tier: 'Silver Scout', pts: 30, emoji: '⭐' },
            { tier: 'Gold Scout', pts: 60, emoji: '🏆' },
          ].map((b) => (
            <div
              key={b.tier}
              className={`flex flex-col items-center p-2 rounded-lg text-center ${profile.scout_score >= b.pts ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-300'}`}
            >
              <span className="text-xl">{b.emoji}</span>
              <span className="text-xs font-medium mt-1">{b.tier}</span>
              <span className="text-xs">{b.pts}+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sightings */}
      <h2 className="text-sm font-semibold text-gray-600 mb-3">Reported Cats ({sightings.length})</h2>
      {sightings.length === 0 ? (
        <p className="text-sm text-gray-400">No cats reported yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sightings.map((s) => (
            <Link
              key={s.id}
              href={s.cats ? `/cats/${s.cats.id}` : '#'}
              className="bg-white rounded-xl border overflow-hidden hover:border-orange-300 transition-colors"
            >
              <img src={s.photo_url} alt="Cat" className="w-full h-36 object-cover" />
              <div className="p-2">
                <p className="text-sm font-medium text-gray-700 truncate">{s.cats?.name ?? 'Street Cat'}</p>
                {s.cats && (
                  <StatusBadge status={s.cats.status as 'spotted' | 'needs_foster' | 'adopted'} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
