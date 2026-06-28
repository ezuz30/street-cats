'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { blurCoordinates } from '@/lib/database.types'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Cat = Database['public']['Tables']['cats']['Row']

const CatMap = dynamic(() => import('@/components/CatMap'), { ssr: false })

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null)
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nearbyCats, setNearbyCats] = useState<Cat[]>([])
  const [clusterCatId, setClusterCatId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Your browser does not support location.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setError('Could not get your location — please allow access or pin manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/auth')
      else setUser(data.user)
    })
  }, [router])

  useEffect(() => {
    if (!pin) return
    // Find cats within ~300m to suggest clustering
    supabase
      .from('cats')
      .select('*')
      .neq('status', 'adopted')
      .then(({ data }) => {
        const close = (data ?? []).filter((cat) => {
          const d = Math.abs(cat.lat - pin.lat) + Math.abs(cat.lng - pin.lng)
          return d < 0.005 // ~300m
        })
        setNearbyCats(close)
        if (close.length > 0) setClusterCatId(close[0].id)
      })
  }, [pin])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) { setError('Please click the map to pin the cat\'s location.'); return }
    if (!photo) { setError('Please select a photo.'); return }
    if (!description.trim()) { setError('Please add a short description.'); return }
    if (!user) return
    setLoading(true)
    setError('')

    // Upload photo to Supabase Storage
    const ext = photo.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('cat-photos').upload(path, photo)
    if (uploadError) { setError('Photo upload failed: ' + uploadError.message); setLoading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('cat-photos').getPublicUrl(path)

    const blurred = blurCoordinates(pin.lat, pin.lng)

    let catId = clusterCatId

    if (!catId) {
      // Create new cat record
      const { data: newCat, error: catError } = await supabase
        .from('cats')
        .insert({ name: name || null, description, status: 'spotted', lat: blurred.lat, lng: blurred.lng })
        .select()
        .single()
      if (catError || !newCat) { setError('Failed to save cat: ' + catError?.message); setLoading(false); return }
      catId = newCat.id
    }

    // Create sighting
    const { error: sightingError } = await supabase.from('sightings').insert({
      cat_id: catId,
      photographer_id: user.id,
      photo_url: publicUrl,
      original_lat: pin.lat,
      original_lng: pin.lng,
    })
    if (sightingError) { setError('Failed to save sighting: ' + sightingError.message); setLoading(false); return }

    router.push(`/cats/${catId}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Report a Street Cat</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        {/* Left: photo + description */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 transition-colors"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
              ) : (
                <div className="py-8 text-gray-400">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">Click to upload a photo</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cat name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Ginger tom near the bakery"'
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the cat — color, size, temperament, when you saw it…"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Cluster suggestion */}
          {nearbyCats.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm font-medium text-orange-700 mb-2">
                🐱 Cats already reported nearby — is this the same cat?
              </p>
              {nearbyCats.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="cluster"
                    checked={clusterCatId === cat.id}
                    onChange={() => setClusterCatId(cat.id)}
                  />
                  {cat.name ?? 'Unknown cat'} — {cat.description.slice(0, 50)}…
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-1">
                <input
                  type="radio"
                  name="cluster"
                  checked={clusterCatId === null}
                  onChange={() => setClusterCatId(null)}
                />
                This is a different cat
              </label>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 text-white font-semibold rounded-lg py-2.5 hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Submit Report'}
          </button>
        </div>

        {/* Right: map pin */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Pin the location * <span className="text-gray-400 font-normal">(tap the map)</span>
            </label>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
            >
              {locating ? '📍 Locating…' : '📍 Use my current location'}
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ height: '420px' }}>
            <CatMap
              cats={[]}
              pinMode={true}
              selectedPin={pin}
              flyTo={pin}
              onPinSelect={(lat, lng) => setPin({ lat, lng })}
            />
          </div>
          {pin ? (
            <p className="text-xs text-green-600 mt-1">
              ✓ Location pinned ({pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}) — blurred ~100m before publishing
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Click anywhere on the map to drop a pin</p>
          )}
        </div>
      </form>
    </div>
  )
}
