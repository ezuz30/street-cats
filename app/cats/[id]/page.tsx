'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import type { Database, CatStatus } from '@/lib/database.types'
import type { User } from '@supabase/supabase-js'

type Cat = Database['public']['Tables']['cats']['Row']
type Sighting = Database['public']['Tables']['sightings']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function CatPage() {
  const { id } = useParams<{ id: string }>()
  const [cat, setCat] = useState<Cat | null>(null)
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [photographer, setPhotographer] = useState<Profile | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    supabase.from('cats').select('*').eq('id', id).single().then(({ data }) => setCat(data))
    supabase.from('sightings').select('*').eq('cat_id', id).order('created_at', { ascending: false })
      .then(({ data }) => {
        setSightings(data ?? [])
        if (data && data[0]) {
          supabase.from('profiles').select('*').eq('id', data[0].photographer_id).single()
            .then(({ data: p }) => setPhotographer(p))
        }
      })
  }, [id])

  const handleAdopt = async () => {
    if (!user || !cat || !sightings[0]) return
    setLoading(true)
    const { data: existing } = await supabase
      .from('adoption_requests')
      .select('id')
      .eq('cat_id', id)
      .eq('requester_id', user.id)
      .single()
    if (existing) { alert('You already sent a request for this cat.'); setLoading(false); return }

    const { error } = await supabase.from('adoption_requests').insert({
      cat_id: id,
      requester_id: user.id,
      photographer_id: sightings[0].photographer_id,
      message,
      status: 'pending',
    })
    if (!error) setSent(true)
    setLoading(false)
  }

  const handleStatusChange = async (status: CatStatus) => {
    await supabase.from('cats').update({ status }).eq('id', id)
    setCat((prev) => prev ? { ...prev, status } : prev)

    if (status === 'adopted' && sightings[0]) {
      // Increment photographer scout score by 10
      await supabase.rpc('increment_scout_score', { photographer_id: sightings[0].photographer_id })
    }
  }

  if (!cat) return <div className="p-8 text-gray-400">Loading…</div>

  const isPhotographer = user?.id === sightings[0]?.photographer_id

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{cat.name ?? 'Street Cat'}</h1>
          <div className="mt-1">
            <StatusBadge status={cat.status} />
          </div>
        </div>
        {(isPhotographer || adminMode) && (
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-gray-400">Update status:</p>
            {(['spotted', 'needs_foster', 'adopted'] as CatStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={cat.status === s}
                className={`text-xs px-3 py-1 rounded-full ${cat.status === s ? 'bg-gray-200 text-gray-400' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
              >
                → {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photos grid */}
      {sightings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {sightings.map((s) => (
            <img key={s.id} src={s.photo_url} alt="Cat sighting" className="rounded-xl object-cover w-full h-48" />
          ))}
        </div>
      )}

      {/* Description */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-1">About this cat</h2>
        <p className="text-gray-700">{cat.description}</p>
      </div>

      {/* Sightings count */}
      <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 mb-6 flex items-center gap-3">
        <span className="text-2xl">📍</span>
        <div>
          <p className="font-semibold text-gray-800">{sightings.length} sighting{sightings.length !== 1 ? 's' : ''} reported</p>
          <p className="text-xs text-gray-500">Location blurred to ~100m radius for privacy</p>
        </div>
      </div>

      {/* Photographer */}
      {photographer && (
        <div className="bg-white rounded-xl border p-4 mb-6 flex items-center gap-3">
          <span className="text-3xl">📸</span>
          <div>
            <p className="text-sm text-gray-500">First spotted by</p>
            <Link href={`/profile/${photographer.id}`} className="font-semibold text-orange-500 hover:underline">
              {photographer.username}
            </Link>
          </div>
        </div>
      )}

      {/* Adoption section */}
      {cat.status !== 'adopted' && user && !isPhotographer && (
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Want to adopt this cat?</h2>
          {sent ? (
            <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm">
              ✓ Your request was sent! Check <Link href="/messages" className="underline">Messages</Link> for the reply.
            </div>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Introduce yourself — why do you want to adopt this cat?"
                className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <button
                onClick={handleAdopt}
                disabled={loading || !message.trim()}
                className="bg-orange-500 text-white font-semibold rounded-lg px-6 py-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'I want to adopt this cat'}
              </button>
            </>
          )}
        </div>
      )}

      {!user && cat.status !== 'adopted' && (
        <div className="bg-gray-50 rounded-xl border p-4 text-center">
          <p className="text-gray-600 mb-3">Sign in to request adoption</p>
          <Link href="/auth" className="bg-orange-500 text-white px-5 py-2 rounded-full font-medium hover:bg-orange-600">
            Sign In
          </Link>
        </div>
      )}

      {/* Admin toggle (temporary, for testing) */}
      {user && (
        <button
          onClick={() => setAdminMode(!adminMode)}
          className="mt-4 text-xs text-gray-300 hover:text-gray-500"
        >
          {adminMode ? 'Exit admin mode' : 'Admin mode'}
        </button>
      )}
    </div>
  )
}
