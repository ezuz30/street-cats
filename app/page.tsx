'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import type { CatStatus } from '@/lib/database.types'

type RecentCat = {
  id: string
  name: string | null
  description: string
  status: CatStatus
  photo_url: string
}

export default function HomePage() {
  const [stats, setStats] = useState({ spotted: 0, adopted: 0, scouts: 0 })
  const [recent, setRecent] = useState<RecentCat[]>([])

  useEffect(() => {
    // Impact stats
    supabase.from('cats').select('id', { count: 'exact', head: true }).then(({ count }) =>
      setStats((s) => ({ ...s, spotted: count ?? 0 }))
    )
    supabase
      .from('cats')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'adopted')
      .then(({ count }) => setStats((s) => ({ ...s, adopted: count ?? 0 })))
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) =>
      setStats((s) => ({ ...s, scouts: count ?? 0 }))
    )

    // Recently spotted (latest sightings, one card per cat)
    supabase
      .from('sightings')
      .select('photo_url, created_at, cats(id, name, description, status)')
      .order('created_at', { ascending: false })
      .limit(18)
      .then(({ data }) => {
        const seen = new Set<string>()
        const cards: RecentCat[] = []
        for (const row of (data ?? []) as unknown as Array<{ photo_url: string; cats: RecentCat | null }>) {
          const c = row.cats
          if (!c || seen.has(c.id)) continue
          seen.add(c.id)
          cards.push({ ...c, photo_url: row.photo_url })
          if (cards.length >= 6) break
        }
        setRecent(cards)
      })
  }, [])

  return (
    <div className="flex flex-col flex-1">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white">
        {/* decorative paw prints */}
        <div className="pointer-events-none absolute inset-0 opacity-10 text-7xl select-none">
          <span className="absolute top-10 left-[8%]">🐾</span>
          <span className="absolute top-1/2 left-[80%]">🐾</span>
          <span className="absolute bottom-8 left-[20%]">🐾</span>
          <span className="absolute top-16 left-[60%] text-5xl">🐾</span>
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <span className="inline-block bg-white/20 backdrop-blur px-4 py-1 rounded-full text-sm font-medium mb-6">
            🐱 Community-powered cat rescue
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight mb-5">
            Every street cat<br className="hidden md:block" /> deserves a home.
          </h1>
          <p className="text-lg md:text-xl text-orange-50 max-w-2xl mx-auto mb-9">
            Spot a cat in your neighborhood, snap a photo, and drop a pin — and help
            someone nearby give it a loving home.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/map"
              className="bg-white text-orange-600 font-semibold px-7 py-3 rounded-full hover:bg-orange-50 transition-colors shadow-lg shadow-orange-900/10"
            >
              🗺️ Explore the map
            </Link>
            <Link
              href="/upload"
              className="bg-orange-600/30 border border-white/60 text-white font-semibold px-7 py-3 rounded-full hover:bg-orange-600/50 transition-colors"
            >
              + Report a cat
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- IMPACT STATS ---------- */}
      <section className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-4 text-center">
          <Stat value={stats.spotted} label="Cats spotted" />
          <Stat value={stats.adopted} label="Found a home" />
          <Stat value={stats.scouts} label="Scouts helping" />
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center text-gray-800 mb-3">
            How it works
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Helping a street cat takes about a minute — and your exact location always
            stays private.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Step
              icon="📸"
              title="Spot & snap"
              text="See a street cat? Take a photo right from your phone."
            />
            <Step
              icon="📍"
              title="Pin the location"
              text="Drop a pin on the map. We blur it ~100m to protect privacy."
            />
            <Step
              icon="🏠"
              title="Help it get adopted"
              text="People nearby see the cat and can reach you to give it a home."
            />
          </div>
        </div>
      </section>

      {/* ---------- RECENTLY SPOTTED ---------- */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-heading text-3xl font-bold text-gray-800">Recently spotted</h2>
              <p className="text-gray-500 mt-1">Cats waiting for someone like you.</p>
            </div>
            <Link href="/map" className="text-orange-600 font-semibold hover:underline whitespace-nowrap">
              See all on map →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed">
              <div className="text-5xl mb-3">🐈</div>
              <p className="text-gray-600 font-medium">No cats reported yet.</p>
              <p className="text-gray-400 text-sm mb-5">Be the first to help a street cat find a home.</p>
              <Link
                href="/upload"
                className="inline-block bg-orange-500 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-orange-600 transition-colors"
              >
                + Report the first cat
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {recent.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/cats/${cat.id}`}
                  className="group rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.photo_url}
                      alt={cat.name ?? 'Street cat'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {cat.name ?? 'Unknown cat'}
                      </h3>
                      <StatusBadge status={cat.status} />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{cat.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- SCOUT TEASER ---------- */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-5xl mb-4">🏅</div>
          <h2 className="font-heading text-3xl font-bold text-gray-800 mb-3">Become a Scout</h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-2">
            Every cat that finds a home through your photos lifts your Scout score.
            Climb from <span className="font-semibold text-gray-800">Newcomer</span> to{' '}
            <span className="font-semibold text-amber-600">Gold Scout</span> and earn your
            place among the people making your city kinder.
          </p>
        </div>
      </section>

      {/* ---------- CLOSING CTA ---------- */}
      <section className="bg-gradient-to-br from-orange-500 to-amber-500 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to help a cat today?
          </h2>
          <p className="text-orange-50 mb-8">
            It only takes a minute, and it could change a life.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/upload"
              className="bg-white text-orange-600 font-semibold px-7 py-3 rounded-full hover:bg-orange-50 transition-colors shadow-lg shadow-orange-900/10"
            >
              + Report a cat
            </Link>
            <Link
              href="/map"
              className="bg-orange-600/30 border border-white/60 text-white font-semibold px-7 py-3 rounded-full hover:bg-orange-600/50 transition-colors"
            >
              🗺️ Explore the map
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p className="text-white font-heading font-bold text-lg mb-1">🐱 StreetCats</p>
        <p>Made with care for the cats of our streets.</p>
      </footer>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-heading text-3xl md:text-4xl font-extrabold text-orange-500">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function Step({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-heading font-bold text-lg text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
    </div>
  )
}
