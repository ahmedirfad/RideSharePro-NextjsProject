'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Search, Send, MessageCircle, Loader2, Check, CheckCheck,
  ArrowLeft, MoreVertical, Smile,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useChat } from '@/hooks/useChat'

interface Conversation {
  bookingId: string
  tripId: string
  route: string
  date: string
  otherParty: { name: string; photo: string }
  lastMessage: { text: string; time: string; senderName: string } | null
  unreadCount: number
}

function timeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)   return 'now'
  if (mins < 60)  return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function fullTimeAgo(dateStr: string) {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Deterministic accent color per person — keeps avatars visually distinct
// across a long conversation list without needing real photo data.
const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-purple-700',
  'from-rose-500 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-700',
  'from-cyan-500 to-sky-700',
]
function avatarGradient(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

// ── Day separator helper ────────────────────────────────────────────────────
function dayLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Chat Window ───────────────────────────────────────────────────────────────
function ChatWindow({
  conversation, currentUserId, onBack,
}: {
  conversation: Conversation; currentUserId: string; onBack: () => void
}) {
  const { messages, loading, isTyping, sendMessage, emitTyping, emitStopTyping } = useChat(
    conversation.bookingId, currentUserId
  )
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gradient = avatarGradient(conversation.otherParty.name)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    inputRef.current?.focus()
  }, [conversation.bookingId])

  const handleInput = (v: string) => {
    setInput(v)
    emitTyping()
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(emitStopTyping, 1500)
  }

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
    setSending(true)
    setTimeout(() => setSending(false), 200)
  }

  // Group messages with day separators
  let lastDay = ''

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white/95 backdrop-blur-sm shrink-0">
        <button onClick={onBack} className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${gradient} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm`}>
          {initials(conversation.otherParty.name)}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{conversation.otherParty.name}</p>
          <p className="text-[11px] text-blue-500 font-medium truncate">{conversation.route}</p>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 shrink-0">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-1"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.025) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
          backgroundColor: '#fafbfd',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <p className="text-xs text-gray-400">Loading conversation…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-100">
              <MessageCircle size={22} className="text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Say hello to {conversation.otherParty.name.split(' ')[0]}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[220px]">Coordinate pickup time, location, or anything else about the ride.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.sender.id === currentUserId
            const day = dayLabel(msg.createdAt)
            const showDaySeparator = day !== lastDay
            lastDay = day

            const prevMsg = messages[idx - 1]
            const isGrouped = !showDaySeparator && prevMsg && prevMsg.sender.id === msg.sender.id

            return (
              <div key={msg.id}>
                {showDaySeparator && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-semibold text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                      {day}
                    </span>
                  </div>
                )}
                <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
                  {!isMe && (
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} text-white text-[8px] font-bold flex items-center justify-center shrink-0 self-end ${isGrouped ? 'opacity-0' : ''}`}>
                      {initials(msg.sender.name)}
                    </div>
                  )}
                  <div className={`group flex flex-col gap-1 max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-relaxed shadow-sm transition-transform ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-md'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[9px] text-gray-400">{fullTimeAgo(msg.createdAt)}</span>
                      {isMe && (
                        msg.readBy.length > 1
                          ? <CheckCheck size={11} className="text-blue-400" />
                          : <Check size={11} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 mt-3">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} text-white text-[8px] font-bold flex items-center justify-center shrink-0 self-end`}>
              {initials(conversation.otherParty.name)}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3.5 border-t border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition">
          <button className="text-gray-400 hover:text-gray-600 transition shrink-0">
            <Smile size={18} />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={`Message ${conversation.otherParty.name.split(' ')[0]}…`}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none py-1.5"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              input.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200'
                : 'bg-gray-200 text-gray-400'
            } ${sending ? 'scale-90' : 'scale-100'}`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Conversation list item ───────────────────────────────────────────────────
function ConversationItem({
  conv, isActive, onClick,
}: {
  conv: Conversation; isActive: boolean; onClick: () => void
}) {
  const gradient = avatarGradient(conv.otherParty.name)
  const hasUnread = conv.unreadCount > 0

  return (
    <div
      onClick={onClick}
      className={`relative flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-600 rounded-full" />}

      <div className="relative shrink-0">
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} text-white text-xs font-bold flex items-center justify-center shadow-sm`}>
          {initials(conv.otherParty.name)}
        </div>
        {hasUnread && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
            {conv.otherParty.name}
          </p>
          {conv.lastMessage && (
            <span className={`text-[10px] shrink-0 ${hasUnread ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
              {timeAgo(conv.lastMessage.time)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-blue-500/80 font-medium truncate mt-0.5">{conv.route}</p>
        {conv.lastMessage ? (
          <p className={`text-xs truncate mt-1 ${hasUnread ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
            {conv.lastMessage.senderName === 'You' ? 'You: ' : ''}{conv.lastMessage.text}
          </p>
        ) : (
          <p className="text-xs text-gray-300 italic mt-1">No messages yet</p>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const searchParams = useSearchParams()
  const { user }      = useAuthStore()
  const currentUserId = user?.id || ''

  const [conversations, setConversations]           = useState<Conversation[]>([])
  const [loading, setLoading]                       = useState(true)
  const [search, setSearch]                         = useState('')
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages')
      if (res.data.success) setConversations(res.data.data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Auto-open conversation from URL param
  useEffect(() => {
    const bookingId = searchParams.get('bookingId')
    if (bookingId && conversations.length > 0) {
      const conv = conversations.find(c => c.bookingId === bookingId)
      if (conv) setActiveConversation(conv)
    }
  }, [searchParams, conversations])

  const filtered = conversations.filter(c =>
    c.otherParty.name.toLowerCase().includes(search.toLowerCase()) ||
    c.route.toLowerCase().includes(search.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="h-[calc(100vh-80px)] flex rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Sidebar — conversation list */}
      <div className={`w-full lg:w-[340px] shrink-0 border-r border-gray-100 flex flex-col ${activeConversation ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-bold text-gray-900 text-lg tracking-tight">Messages</h2>
            {totalUnread > 0 && (
              <span className="text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {totalUnread} new
              </span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or route..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={22} className="animate-spin text-blue-400" />
              <p className="text-xs text-gray-400">Loading conversations…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={20} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {search ? 'No matches found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {search ? 'Try a different search term' : 'Book a trip to start chatting with your driver'}
              </p>
            </div>
          ) : filtered.map(conv => (
            <ConversationItem
              key={conv.bookingId}
              conv={conv}
              isActive={activeConversation?.bookingId === conv.bookingId}
              onClick={() => {
                setActiveConversation(conv)
                setConversations(prev => prev.map(c =>
                  c.bookingId === conv.bookingId ? { ...c, unreadCount: 0 } : c
                ))
              }}
            />
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className={`flex-1 ${activeConversation ? 'flex' : 'hidden lg:flex'} flex-col`}>
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            currentUserId={currentUserId}
            onBack={() => setActiveConversation(null)}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center px-8"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0 0 0 / 0.02) 1px, transparent 0)`,
              backgroundSize: '24px 24px',
              backgroundColor: '#fafbfd',
            }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-[28px] flex items-center justify-center mb-5 ring-1 ring-blue-100 shadow-sm">
              <MessageCircle size={32} className="text-blue-500" strokeWidth={1.7} />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1.5">Your conversations</h3>
            <p className="text-sm text-gray-400 max-w-[260px] leading-relaxed">
              Select a conversation on the left to chat with your driver or passenger.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}