'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('adoption_requests')
      .select('id', { count: 'exact' })
      .eq('photographer_id', user.id)
      .eq('status', 'pending')
      .then(({ count }) => setUnread(count ?? 0))
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="bg-orange-500 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <Link href="/" className="text-xl font-bold tracking-tight flex items-center gap-2">
        🐱 StreetCats
      </Link>
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link href="/map" className="hover:text-orange-100">Map</Link>
        {user ? (
          <>
            <Link href="/upload" className="bg-white text-orange-500 px-3 py-1 rounded-full hover:bg-orange-50">
              + Report a Cat
            </Link>
            <Link href="/messages" className="hover:text-orange-100 relative">
              Messages
              {unread > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>
            <Link href={`/profile/${user.id}`} className="hover:text-orange-100">Profile</Link>
            <button onClick={handleSignOut} className="hover:text-orange-100">Sign out</button>
          </>
        ) : (
          <Link href="/auth" className="bg-white text-orange-500 px-3 py-1 rounded-full hover:bg-orange-50">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
