'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Radio, Clock, Users, MessageCircle, Send, Zap,
  AlertTriangle, Shield, Navigation, CheckCircle2,
  XCircle, Star, Car, Bell, ChevronRight, Share2,
  Phone, Activity, MapPin, TrendingUp, Fuel,
  ArrowLeft, MoreVertical, Loader2,
} from 'lucide-react'

const ActiveTripMap = dynamic(() => import('@/components/maps/ActiveTripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-medium tracking-wide">Connecting to live feed…</span>
      </div>
    </div>
  ),
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: number
  sender: 'driver' | 'you' | 'passenger'
  name: string
  avatar: string
  color: string
  text: string
  time: string
}

interface Stop {
  id: number
  label: string
  sublabel: string
  status: 'done' | 'next' | 'upcoming'
  ai?: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const INITIAL_MESSAGES: Message[] = [
  {
    id: 1, sender: 'driver', name: 'Arjun Kumar', avatar: 'AK', color: '#2563eb',
    text: "Hi everyone! I'm Arjun, your driver today. Just a reminder — we have a quick AI-optimised pickup at Calicut University Gate. 🚗",
    time: '05:40 AM',
  },
  {
    id: 2, sender: 'you', name: 'You', avatar: 'ME', color: '#2563eb',
    text: "Great! I'll be at the gate by 2:25. See you soon!",
    time: '05:41 AM',
  },
  {
    id: 3, sender: 'passenger', name: 'Meera', avatar: 'MN', color: '#d97706',
    text: "Perfect! I'm already in the back seat. Arjun is a great driver. See you all at the stop.",
    time: '06:00 AM',
  },
]

const STOPS: Stop[] = [
  { id: 1, label: 'Kozhikode — Departure', sublabel: 'Started at 6:00 AM', status: 'done' },
  { id: 2, label: 'Calicut University Gate (AI Pickup)', sublabel: 'Arrival in 12 mins · Optimal route detected', status: 'next', ai: true },
  { id: 3, label: 'Feroke — Passenger Drop', sublabel: 'Est. 45 mins from now', status: 'upcoming' },
  { id: 4, label: 'Bangalore — Final Destination', sublabel: 'Est. 6:23 AM arrival', status: 'upcoming' },
]

// ─── SOS Button ───────────────────────────────────────────────────────────────
function SosButton() {
  const [phase, setPhase] = useState<'idle' | 'counting' | 'sent'>('idle')
  const [count, setCount] = useState(5)
  const timerRef = useRef<any>(null)

  const startSos = () => {
    setPhase('counting')
    setCount(5)
    let c = 5
    timerRef.current = setInterval(() => {
      c--
      setCount(c)
      if (c <= 0) { clearInterval(timerRef.current); setPhase('sent') }
    }, 1000)
  }
  const abort = () => { clearInterval(timerRef.current); setPhase('idle'); setCount(5) }
  const reset = () => setPhase('idle')

  if (phase === 'counting') return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="bg-[#0f1117] border border-red-500/30 rounded-3xl p-10 flex flex-col items-center gap-6 max-w-xs w-full mx-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 rounded-3xl" />
        <div className="absolute w-40 h-40 rounded-full border border-red-500/10 animate-ping" style={{ animationDuration: '1.5s' }} />
        <AlertTriangle className="text-red-500 w-10 h-10 animate-pulse relative z-10" />
        <div className="text-center relative z-10">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest">SOS Initiating</p>
          <p className="text-gray-500 text-xs mt-1">Broadcasting GPS to emergency contacts</p>
        </div>
        <span className="text-7xl font-mono font-black text-white relative z-10">{count}</span>
        <button onClick={abort} className="w-full py-3 bg-red-500/10 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition relative z-10">
          Abort SOS
        </button>
      </div>
    </div>
  )

  if (phase === 'sent') return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      <div className="bg-[#0f1117] border border-green-500/30 rounded-3xl p-10 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
        <CheckCircle2 className="text-green-500 w-12 h-12" />
        <p className="text-white font-bold text-center">Location shared. Help is on the way.</p>
        <button onClick={reset} className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl">
          OK
        </button>
      </div>
    </div>
  )

  return (
    <button onClick={startSos}
      className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-red-900/40">
      <AlertTriangle size={15} /> SOS — Send My Location
    </button>
  )
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: Message }) {
  const isYou = msg.sender === 'you'
  return (
    <div className={`flex gap-2.5 ${isYou ? 'flex-row-reverse' : ''}`}>
      {!isYou && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-0.5"
          style={{ background: msg.color }}
        >
          {msg.avatar}
        </div>
      )}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isYou ? 'items-end' : 'items-start'}`}>
        {!isYou && <span className="text-[10px] text-gray-400 font-semibold px-1">{msg.name}</span>}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isYou
            ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-900/30'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.text}
        </div>
        <span className="text-[9px] text-gray-400 px-1">{msg.time}</span>
      </div>
    </div>
  )
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, value, label, accent = 'text-gray-700' }: { icon: any; value: string; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
      <Icon size={13} className={accent} />
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActiveTripPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [kmLeft, setKmLeft] = useState(180)
  const [progress, setProgress] = useState(47)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-type reply simulation
  useEffect(() => {
    const t1 = setTimeout(() => setTyping(true), 4000)
    const t2 = setTimeout(() => {
      setTyping(false)
      setMessages(p => [...p, {
        id: Date.now(), sender: 'driver', name: 'Arjun Kumar', avatar: 'AK', color: '#2563eb',
        text: "ETA looking great! Skipping the highway toll — saves ~20 mins. 🎯",
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }])
    }, 7500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Simulate live km countdown
  useEffect(() => {
    const t = setInterval(() => {
      setKmLeft(k => Math.max(0, k - 1))
      setProgress(p => Math.min(99, p + 0.1))
    }, 6000)
    return () => clearInterval(t)
  }, [])

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(p => [...p, {
      id: Date.now(), sender: 'you', name: 'You', avatar: 'ME', color: '#2563eb',
      text: input.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }])
    setInput('')
  }

  return (
    // Full viewport, no outer padding (override layout's p-6)
    <div className="-m-6 min-h-screen bg-gray-50 flex flex-col">

      {/* ── LIVE HEADER BAR ── */}
      <div className="bg-gray-900 border-b border-white/5 px-5 py-2.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Live badge */}
          <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> LIVE
          </span>
          {/* Route */}
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-green-400">Kozhikode</span>
            <ChevronRight size={13} className="text-gray-600" />
            <span className="text-white">Bangalore</span>
          </div>
          {/* Date */}
          <span className="hidden md:inline text-xs text-gray-500 border-l border-gray-700 pl-3">
            Today · Jun 4, 2026
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Driver chip */}
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">AK</div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">Arjun Kumar</p>
              <p className="text-gray-400 text-[9px] flex items-center gap-0.5">
                Driver · <Star size={8} fill="currentColor" className="text-amber-400" /> 4.8
              </p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition">
            <Share2 size={12} /> Share ETA
          </button>
          <button className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl transition">
            <Phone size={13} />
          </button>
          <Link href="/trips">
            <button className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl transition">
              <ArrowLeft size={13} />
            </button>
          </Link>
        </div>
      </div>

      {/* ── MAIN: MAP LEFT + CHAT RIGHT ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ════ LEFT PANEL ════ */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* MAP */}
          <div className="relative bg-gray-900" style={{ height: '380px', minHeight: '320px' }}>
            <ActiveTripMap
              from="Kozhikode"
              to="Bangalore"
              progressPct={progress}
              passengerCount={3}
              distanceKm={528}
              etaHours={8}
            />
          </div>

          {/* ── ETA + PROGRESS ── */}
          <div className="bg-white border-b border-gray-100 px-6 py-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Expected Arrival</p>
                <p className="text-5xl font-black text-gray-900 tracking-tight leading-none">
                  6:23 <span className="text-2xl font-bold text-gray-400">AM</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{kmLeft} km remaining</p>
                <p className="text-xs text-gray-400 mt-0.5">4h {Math.floor((528 - kmLeft) / 60)}m elapsed</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-[3000ms]"
                style={{ width: `${progress.toFixed(1)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
              <span>Kozhikode</span>
              <span className="text-blue-500 font-bold">{progress.toFixed(0)}% complete</span>
              <span>Bangalore</span>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <Stat icon={Activity}    value={`${progress.toFixed(0)}%`} label="Done"    accent="text-blue-600" />
              <Stat icon={Navigation}  value={`${528 - kmLeft}km`}       label="Covered"  accent="text-gray-700" />
              <Stat icon={Users}       value="3"                          label="Aboard"   accent="text-green-600" />
              <Stat icon={TrendingUp}  value="₹1,950"                     label="Earned"   accent="text-amber-600" />
            </div>
          </div>

          {/* ── UPCOMING STOPS ── */}
          <div className="bg-white border-b border-gray-100 px-6 py-5">
            <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-4">
              <Navigation size={15} className="text-blue-600" /> Upcoming Stops
            </h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gray-200" />
              <div className="space-y-3">
                {STOPS.map((stop) => (
                  <div key={stop.id} className="flex items-start gap-3.5 pl-1">
                    {/* Dot */}
                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                      stop.status === 'done' ? 'bg-green-500 border-green-500' :
                      stop.status === 'next' ? 'bg-blue-600 border-blue-600' :
                      'bg-white border-gray-300'
                    }`}>
                      {stop.status === 'done'
                        ? <CheckCircle2 size={11} className="text-white" />
                        : stop.status === 'next'
                        ? <span className="w-2 h-2 rounded-full bg-white" />
                        : <span className="w-2 h-2 rounded-full bg-gray-300" />
                      }
                    </div>
                    {/* Content */}
                    <div className={`flex-1 flex items-center justify-between py-2.5 px-3.5 rounded-xl border transition ${
                      stop.status === 'next'
                        ? 'bg-blue-50 border-blue-200'
                        : stop.status === 'done'
                        ? 'bg-gray-50 border-gray-100 opacity-60'
                        : 'bg-white border-gray-100'
                    }`}>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {stop.ai && <Zap size={11} className="text-blue-500 shrink-0" />}
                          <p className={`text-sm font-semibold ${
                            stop.status === 'next' ? 'text-blue-700' :
                            stop.status === 'done' ? 'text-gray-400' :
                            'text-gray-700'
                          }`}>{stop.label}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{stop.sublabel}</p>
                      </div>
                      {stop.status === 'next' && (
                        <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ml-2">
                          NEXT STOP
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── SAFETY REMINDER ── */}
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-start gap-2.5">
              <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                <span className="font-bold">Trip secured</span> · Stripe escrow active · ID-verified participants · Real-time tracking ON
              </p>
            </div>
          </div>
        </div>

        {/* ════ RIGHT PANEL: CHAT ════ */}
        <div className="w-[380px] shrink-0 bg-white border-l border-gray-200 flex flex-col">

          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={15} className="text-blue-600" />
              <span className="font-bold text-gray-900 text-sm">Trip Chat</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Users size={9} /> 3 participants
              </span>
            </div>
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {[
                { label: 'AK', bg: '#2563eb' },
                { label: 'MN', bg: '#d97706' },
                { label: 'ME', bg: '#16a34a' },
              ].map((a, i) => (
                <div key={i}
                  className="w-7 h-7 rounded-full border-2 border-white text-white text-[9px] font-black flex items-center justify-center"
                  style={{ background: a.bg }}>
                  {a.label}
                </div>
              ))}
            </div>
          </div>

          {/* Trip started label */}
          <div className="py-2.5 flex items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
              Trip started 4h ago
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 bg-gray-50/50">
            {messages.map(m => <ChatBubble key={m.id} msg={m} />)}

            {/* Typing indicator */}
            {typing && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">AK</div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.18}s` }} />
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1.5">Arjun is typing…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </div>

          {/* Emergency */}
          <div className="px-4 pb-4 space-y-2.5 bg-white border-t border-gray-100 pt-3">
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3">
              <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">Emergency Assistance</p>
                <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed">
                  Share your live location with local authorities and emergency contacts instantly.
                </p>
              </div>
            </div>
            <SosButton />
          </div>
        </div>
      </div>
    </div>
  )
}
