'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type Request = Database['public']['Tables']['adoption_requests']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Cat = Database['public']['Tables']['cats']['Row']

interface Thread {
  request: Request
  cat: Cat | null
  otherUser: Profile | null
  messages: Message[]
}

export default function MessagesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [selected, setSelected] = useState<Thread | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return }
      setUser(data.user)
      loadThreads(data.user.id)
    })
  }, [router])

  const loadThreads = async (uid: string) => {
    const { data: requests } = await supabase
      .from('adoption_requests')
      .select('*')
      .or(`requester_id.eq.${uid},photographer_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    if (!requests) return

    const enriched: Thread[] = await Promise.all(
      requests.map(async (req) => {
        const [catResult, messagesResult, otherResult] = await Promise.all([
          supabase.from('cats').select('*').eq('id', req.cat_id).single(),
          supabase.from('messages').select('*').eq('request_id', req.id).order('created_at'),
          supabase.from('profiles').select('*').eq('id', uid === req.requester_id ? req.photographer_id : req.requester_id).single(),
        ])
        return {
          request: req,
          cat: catResult.data,
          otherUser: otherResult.data,
          messages: messagesResult.data ?? [],
        }
      })
    )
    setThreads(enriched)
    if (enriched.length > 0) setSelected(enriched[0])
  }

  const handleSend = async () => {
    if (!reply.trim() || !selected || !user) return
    setSending(true)
    await supabase.from('messages').insert({
      request_id: selected.request.id,
      sender_id: user.id,
      body: reply,
    })
    setReply('')
    await loadThreads(user.id)
    setSending(false)
  }

  if (!user) return null

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: '600px' }}>
      {/* Thread list */}
      <div className="w-72 bg-white border-r overflow-y-auto flex flex-col">
        <div className="p-3 border-b text-sm font-semibold text-gray-600">Messages</div>
        {threads.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No messages yet.</div>
        ) : (
          threads.map((thread) => (
            <button
              key={thread.request.id}
              onClick={() => setSelected(thread)}
              className={`flex items-start gap-2 p-3 border-b text-left hover:bg-orange-50 transition-colors ${selected?.request.id === thread.request.id ? 'bg-orange-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {thread.cat?.name ?? 'Street Cat'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {thread.otherUser ? `with ${thread.otherUser.username}` : ''}
                </div>
                {thread.messages.length > 0 && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {thread.messages[thread.messages.length - 1].body}
                  </div>
                )}
              </div>
              {thread.request.status === 'pending' && user.id === thread.request.photographer_id && (
                <span className="w-2 h-2 bg-red-400 rounded-full mt-1.5 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Conversation */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
            <div>
              <Link href={`/cats/${selected.cat?.id}`} className="font-semibold text-gray-800 hover:text-orange-500">
                {selected.cat?.name ?? 'Street Cat'}
              </Link>
              <p className="text-xs text-gray-400">
                with {selected.otherUser?.username ?? 'Unknown'}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              selected.request.status === 'adopted' ? 'bg-green-100 text-green-700' :
              selected.request.status === 'connected' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {selected.request.status}
            </span>
          </div>

          {/* Initial message */}
          <div className="px-5 py-3 bg-orange-50 border-b">
            <p className="text-xs text-gray-500 mb-1">Adoption request</p>
            <p className="text-sm text-gray-700 italic">"{selected.request.message}"</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {selected.messages.map((msg) => {
              const isMe = msg.sender_id === user.id
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-orange-500 text-white' : 'bg-white text-gray-800 border'}`}>
                    {msg.body}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reply */}
          <div className="bg-white border-t p-3 flex gap-2">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message…"
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !reply.trim()}
              className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Select a conversation
        </div>
      )}
    </div>
  )
}
