import { createClient } from '@supabase/supabase-js'

// Normalize the Supabase URL so common copy-paste mistakes don't crash the app:
// trims whitespace, strips a stray "/rest/v1/" suffix or trailing slashes, and
// adds "https://" if the protocol was left off. Falls back to a valid placeholder
// (so the build never fails) if the value is unusable.
function normalizeSupabaseUrl(raw: string | undefined): string {
  let url = (raw || '').trim()
  if (!url) return 'https://placeholder.supabase.co'
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url
  } catch {
    // fall through to placeholder
  }
  return 'https://placeholder.supabase.co'
}

const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key').trim()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
