'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Clock, Users, MessageCircle, Send, Zap,
  AlertTriangle, Shield, Navigation, CheckCircle2,
  XCircle, Star, Car, Bell, ChevronRight, Share2,
  Phone, Activity, MapPin, TrendingUp,
  ArrowLeft, MoreVertical, Loader2
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const ActiveTripMap = dynamic(() => import('@/components/maps/ActiveTripMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] w-full bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs font-medium tracking-wide">Loading map...</span>
      </div>
    </div>
  ),
})

// Types
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
  order: number
  distanceFromStart: number
}

interface Waypoint {
  name: string
  order: number
  distanceFromStart: number
  coordinates: [number, number]
}

interface Booking {
  _id: string
  fromName: string
  toName: string
  fromOrder: number
  toOrder: number
  seatNumber: number
  passengerId: { name: string; avatar?: string }
}

interface TripData {
  _id: string
  from: string
  to: string
  waypoints: Waypoint[]
  departureDate: string
  departureTime: string
  totalDistanceKm: number
  driverId: {
    _id: string
    name: string
    rating: number
    isVerified: boolean
  }
  bookings?: Booking[]
  status: string
}

// Helper function to format time
function formatTime(timeStr: string): string {
  const [hour, minute] = timeStr.split(':')
  const h = parseInt(hour)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 || 12
  return `${displayHour}:${minute} ${period}`
}

// Helper to calculate ETA
function calculateETA(departureTime: string, distanceKm: number, progress: number): string {
  const remainingKm = distanceKm * (1 - progress / 100)
  const avgSpeed = 60 // km/h
  const remainingHours = remainingKm / avgSpeed
  const [hour, minute] = departureTime.split(':')
  let h = parseInt(hour)
  const totalMinutes = h * 60 + parseInt(minute) + remainingHours * 60
  const etaHour = Math.floor(totalMinutes / 60) % 24
  const etaMinute = Math.floor(totalMinutes % 60)
  const period = etaHour >= 12 ? 'PM' : 'AM'
  const displayHour = etaHour % 12 || 12
  return `${displayHour}:${etaMinute.toString().padStart(2, '0')} ${period}`
}

// Helper to get passenger initials
function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ActiveTrip() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const tripId = params.id as string

  const [trip, setTrip] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [passengerCount, setPassengerCount] = useState(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch trip and booking data
  useEffect(() => {
    const fetchTripData = async () => {
      if (!tripId) return
      
      setLoading(true)
      try {
        const response = await api.get(`/trips/${tripId}`)
        if (response.data.success) {
          const tripData = response.data.data
          setTrip(tripData)
          
          // Calculate passenger count
          const bookings = tripData.bookings || []
          const uniquePassengers = new Set(bookings.map((b: any) => b.passengerId?._id))
          setPassengerCount(uniquePassengers.size)
          
          // Calculate total earned
          // Need to fetch bookings separately or from trip
          setTotalEarned(0) // Will be calculated from bookings
          
          // Build welcome message from driver
          const welcomeMessage: Message = {
            id: 1,
            sender: 'driver',
            name: tripData.driverId.name,
            avatar: getInitials(tripData.driverId.name),
            color: '#2563eb',
            text: `Hi everyone! I'm ${tripData.driverId.name}, your driver today. We'll be traveling from ${tripData.from} to ${tripData.to}. Please let me know if you have any questions! 🚗`,
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          }
          setMessages([welcomeMessage])
        }
      } catch (err: any) {
        console.error('Failed to fetch trip data:', err)
        setError(err.response?.data?.message || 'Failed to load trip')
      } finally {
        setLoading(false)
      }
    }
    
    if (isAuthenticated && tripId) {
      fetchTripData()
    }
  }, [tripId, isAuthenticated])

  // Simulate progress updates
  useEffect(() => {
    if (!trip) return
    
    // Calculate progress based on elapsed time since departure
    const departureDateTime = new Date(`${trip.departureDate}T${trip.departureTime}`)
    const now = new Date()
    const totalDuration = 8 * 60 * 60 * 1000 // 8 hours in ms (approximate)
    const elapsed = Math.max(0, now.getTime() - departureDateTime.getTime())
    let calculatedProgress = Math.min(99, (elapsed / totalDuration) * 100)
    
    // Determine current stop based on progress
    if (trip.waypoints && trip.waypoints.length > 0) {
      const totalDistance = trip.totalDistanceKm || 500
      const currentDistance = (calculatedProgress / 100) * totalDistance
      const currentStop = trip.waypoints.findLast(wp => wp.distanceFromStart <= currentDistance)
      if (currentStop) {
        setCurrentStopIndex(currentStop.order)
      }
    }
    
    setProgress(calculatedProgress)
    
    // Start interval to update progress
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(99, prev + 0.5)
        if (newProgress >= 99) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        }
        return newProgress
      })
    }, 30000) // Update every 30 seconds
    
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [trip])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages(p => [...p, {
      id: Date.now(),
      sender: 'you',
      name: 'You',
      avatar: 'ME',
      color: '#2563eb',
      text: input.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }])
    setInput('')
  }

  // Build stops from waypoints
  const getStops = (): Stop[] => {
    if (!trip || !trip.waypoints) return []
    
    return trip.waypoints.map((wp, index) => {
      let status: 'done' | 'next' | 'upcoming' = 'upcoming'
      if (wp.order < currentStopIndex) status = 'done'
      if (wp.order === currentStopIndex) status = 'next'
      
      return {
        id: wp.order,
        label: wp.name,
        sublabel: wp.order === 0 ? 'Departure' : `${wp.distanceFromStart.toFixed(1)} km from start`,
        status,
        order: wp.order,
        distanceFromStart: wp.distanceFromStart
      }
    })
  }

  const stops = getStops()
  const currentStop = stops.find(s => s.status === 'next')
  const eta = trip ? calculateETA(trip.departureTime, trip.totalDistanceKm || 500, progress) : '--:-- --'
  const totalDistance = trip?.totalDistanceKm || 528
  const distanceCovered = (progress / 100) * totalDistance
  const kmLeft = totalDistance - distanceCovered

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 size={40} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading trip details...</p>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <AlertTriangle size={40} className="text-red-500" />
        <p className="text-gray-500 text-sm">{error || 'Trip not found'}</p>
        <Link href="/trips">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Back to My Trips
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Live Header Bar */}
      <div className="bg-gray-900 rounded-t-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> LIVE
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-green-400">{trip.from}</span>
            <ChevronRight size={13} className="text-gray-600" />
            <span className="text-white">{trip.to}</span>
          </div>
          <span className="hidden md:inline text-xs text-gray-500 border-l border-gray-700 pl-3">
            {new Date(trip.departureDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} · {formatTime(trip.departureTime)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {getInitials(trip.driverId.name)}
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">{trip.driverId.name}</p>
              <p className="text-gray-400 text-[9px] flex items-center gap-0.5">
                Driver · <Star size={8} fill="currentColor" className="text-amber-400" /> {trip.driverId.rating || 0}
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

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-4 p-4 overflow-y-auto lg:overflow-hidden">
        
        {/* LEFT PANEL - Map + Info */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-2xl shadow-sm border border-gray-100">
          
          {/* Map */}
          <div className="relative w-full rounded-t-2xl overflow-hidden" style={{ height: '380px' }}>
            <ActiveTripMap
              from={trip.from}
              to={trip.to}
              progressPct={progress}
              passengerCount={passengerCount}
              distanceKm={totalDistance}
              etaHours={8}
            />
          </div>

          {/* ETA & Progress */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Expected Arrival</p>
                <p className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                  {eta}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{Math.max(0, Math.round(kmLeft))} km remaining</p>
                <p className="text-xs text-gray-400 mt-0.5">{Math.round(distanceCovered)} km covered</p>
              </div>
            </div>
            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
              <span>{trip.from}</span>
              <span className="text-blue-500 font-bold">{Math.round(progress)}% complete</span>
              <span>{trip.to}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Stat icon={Activity} value={`${Math.round(progress)}%`} label="Done" accent="text-blue-600" />
              <Stat icon={Navigation} value={`${Math.round(distanceCovered)}km`} label="Covered" />
              <Stat icon={Users} value={passengerCount.toString()} label="Aboard" accent="text-green-600" />
              <Stat icon={TrendingUp} value={`₹${totalEarned}`} label="Earned" accent="text-amber-600" />
            </div>
          </div>

          {/* Upcoming Stops */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="flex items-center gap-2 font-bold text-gray-900 text-sm mb-4">
              <Navigation size={15} className="text-blue-600" /> Upcoming Stops
            </h3>
            <div className="relative">
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gray-200" />
              <div className="space-y-3">
                {stops.map((stop) => (
                  <div key={stop.id} className="flex items-start gap-3.5 pl-1">
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
                    <div className={`flex-1 flex items-center justify-between py-2.5 px-3.5 rounded-xl border ${
                      stop.status === 'next'
                        ? 'bg-blue-50 border-blue-200'
                        : stop.status === 'done'
                        ? 'bg-gray-50 border-gray-100 opacity-60'
                        : 'bg-white border-gray-100'
                    }`}>
                      <div>
                        <div className="flex items-center gap-1.5">
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

          {/* Safety Reminder */}
          <div className="p-4 bg-blue-50 rounded-b-2xl">
            <div className="flex items-start gap-2.5">
              <Shield size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                <span className="font-bold">Trip secured</span> · Stripe escrow active · ID-verified participants · Real-time tracking ON
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Chat */}
        <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={15} className="text-blue-600" />
              <span className="font-bold text-gray-900 text-sm">Trip Chat</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Users size={9} /> {passengerCount + 1} participants
              </span>
            </div>
            <div className="flex -space-x-2">
              {[
                { label: getInitials(trip.driverId.name), bg: '#2563eb' },
                ...(trip.bookings?.slice(0, 2).map(b => ({
                  label: getInitials(b.passengerId?.name || 'P'),
                  bg: '#d97706'
                })) || [])
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
              Trip in progress
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 bg-gray-50/50">
            {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
            {typing && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {getInitials(trip.driverId.name)}
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.18}s` }} />
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1.5">{trip.driverId.name} is typing…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100">
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

          {/* SOS Section */}
          <div className="px-4 pb-4 space-y-2.5">
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

// Helper Components
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
      <div className="bg-[#0f1117] border border-red-500/30 rounded-3xl p-10 flex flex-col items-center gap-6 max-w-xs w-full mx-4">
        <AlertTriangle className="text-red-500 w-10 h-10 animate-pulse" />
        <div className="text-center">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest">SOS Initiating</p>
          <p className="text-gray-500 text-xs mt-1">Broadcasting GPS to emergency contacts</p>
        </div>
        <span className="text-7xl font-mono font-black text-white">{count}</span>
        <button onClick={abort} className="w-full py-3 bg-red-500/10 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition">
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
            ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.text}
        </div>
        <span className="text-[9px] text-gray-400 px-1">{msg.time}</span>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, value, label, accent = 'text-gray-700' }: { icon: any; value: string; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
      <Icon size={13} className={accent} />
      <p className={`text-sm font-bold ${accent}`}>{value}</p>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  )
}