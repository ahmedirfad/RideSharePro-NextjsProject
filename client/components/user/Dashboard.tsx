'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, ArrowRight, TrendingUp, Car, Search,
  Clock, Star, ChevronRight, Check, UserCheck,
  Zap, Shield, Users, Award, MapPin,
  Navigation, Activity, Wallet, Calendar, Bell, Loader2
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

// ── useCountUp ────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(parseFloat(start.toFixed(decimals)))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration, decimals])
  return val
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ label, value, prefix = '', suffix = '', change, positive, icon: Icon, delay = 0 }: {
  label: string; value: number; prefix?: string; suffix?: string
  change?: string; positive?: boolean; icon: any; delay?: number
}) {
  const decimals = suffix === 'star' ? 1 : 0
  const counted = useCountUp(value, 1400 + delay, decimals)
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition">
          <Icon size={15} className="text-blue-600" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 leading-none mb-2">
        {prefix}
        {suffix === 'star' ? value.toFixed(1) : counted.toLocaleString()}
        {suffix === 'star' && <Star className="inline ml-1 w-5 h-5 text-amber-400 fill-amber-400 align-middle" />}
        {suffix && suffix !== 'star' ? suffix : ''}
      </p>
      {change && (
        <p className={`text-xs font-medium flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-gray-400'}`}>
          {positive && <TrendingUp size={11} />}
          <span>{change}</span>
        </p>
      )}
    </div>
  )
}

// ── Trip Row with Segment Support ─────────────────────────────
function TripRow({ from, to, segment, date, time, seats, status, role, tripId }: {
  from: string; to: string; segment?: string; date: string; time: string
  seats: number; status: 'upcoming' | 'confirmed'; role: 'HOST' | 'GUEST'
  tripId: string
}) {
  if (!tripId || tripId === 'undefined') {
    console.error('TripRow: Invalid tripId', tripId)
    return null
  }
  
  // Use segment if available (for guest trips), otherwise use full route
  const displayFrom = segment ? segment.split(' → ')[0] : from
  const displayTo = segment ? segment.split(' → ')[1] : to
  
  return (
    <Link href={`/trip/${tripId}?returnTo=/dashboard`}>
      <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition group">
        <div className="w-11 shrink-0 text-center">
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{date.split(' ')[0]}</p>
          <p className="text-2xl font-black text-gray-900 leading-tight">
            {date.split(' ')[1]}
          </p>
        </div>
        <div className="w-px h-10 bg-gray-100 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
              role === 'HOST' ? 'bg-purple-100 text-purple-600' : 'bg-cyan-100 text-cyan-600'
            }`}>{role}</span>
            {segment && role === 'GUEST' && (
              <span className="text-[8px] font-medium bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                Your segment
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900 text-sm truncate">
            {displayFrom} → {displayTo}
          </p>
          {segment && role === 'GUEST' && segment !== `${from} → ${to}` && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">
              Full route: {from} → {to}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} />{time} · {seats} seat{seats !== 1 ? 's' : ''}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
          status === 'upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>{status}</span>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition shrink-0" />
      </div>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ hosted: 0, taken: 0, saved: 0, rating: 0 })
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([])
  const [userName, setUserName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  const fetchDashboardData = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Fetch user data
      const userRes = await api.get('/auth/me')
      if (userRes.data.success) {
        setUserName(userRes.data.user.name.split(' ')[0])
      }

      // Fetch trips
      const tripsRes = await api.get('/trips/my-trips/all')
      if (tripsRes.data.success) {
        const allTrips = tripsRes.data.data.all || []
        
        const hostedTrips = allTrips.filter((t: any) => t.role === 'HOST')
        const guestTrips = allTrips.filter((t: any) => t.role === 'GUEST')
        const totalEarned = hostedTrips.reduce((sum: number, t: any) => {
          const amount = parseInt(t.amount.replace('₹', '')) || 0
          return sum + amount
        }, 0)
        
        setStats({
          hosted: hostedTrips.length,
          taken: guestTrips.length,
          saved: totalEarned,
          rating: userRes.data.user.rating || 0,
        })
        
        // Get upcoming trips (max 2) with segment info
        const upcoming = allTrips
          .filter((t: any) => t.status === 'UPCOMING' || t.status === 'CONFIRMED')
          .slice(0, 2)
          .map((t: any) => ({
            id: t.tripId || t.id,
            from: t.route?.split(' → ')[0] || '',
            to: t.route?.split(' → ')[1] || '',
            segment: t.segment || (t.fromName && t.toName ? `${t.fromName} → ${t.toName}` : null),
            date: t.date,
            time: t.time,
            seats: t.role === 'HOST' ? t.seats.total - t.seats.booked : t.seats.booked,
            status: t.status === 'CONFIRMED' ? 'confirmed' : 'upcoming',
            role: t.role,
          }))
        
        console.log('Upcoming trips with IDs:', upcoming)
        setUpcomingTrips(upcoming)
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data', error)
      if (error.response?.status === 401) {
        logout()
        router.replace('/login')
      }
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!mounted) return null

  if (!isAuthenticated && !loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to RideShare</h1>
          <p className="text-blue-100 mb-4">Please login to view your dashboard</p>
          <Link href="/login">
            <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition">
              Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 size={40} className="text-blue-500 animate-spin" />
        <p className="text-gray-500 text-sm">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* GREETING SECTION */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10" style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {getFormattedDate()}
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">{getGreeting()}, {userName || 'Guest'}</h1>
            <p className="text-blue-200 text-sm mt-1.5">
              You have <span className="text-white font-semibold">{upcomingTrips.length} upcoming trip{upcomingTrips.length !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>

        {/* Quick actions row */}
        <div className="relative z-10 mt-5 grid grid-cols-4 gap-3">
          <Link href="/host">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white rounded-2xl border cursor-pointer transition hover:scale-105 shadow-lg">
              <Plus size={17} className="text-blue-600" />
              <span className="text-[10px] font-semibold text-blue-600">Post Trip</span>
            </div>
          </Link>
          <Link href="/search">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-2xl border border-white/20 cursor-pointer transition hover:bg-white/20">
              <Search size={17} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90">Find Ride</span>
            </div>
          </Link>
          <Link href="/trips">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-2xl border border-white/20 cursor-pointer transition hover:bg-white/20">
              <Calendar size={17} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90">My Trips</span>
            </div>
          </Link>
          <Link href="/profile">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-2xl border border-white/20 cursor-pointer transition hover:bg-white/20">
              <Users size={17} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90">Profile</span>
            </div>
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Trips Hosted" value={stats.hosted} change="total" positive={stats.hosted > 0} icon={Car} delay={0} />
        <StatCard label="Trips Taken" value={stats.taken} change="total" positive={stats.taken > 0} icon={Users} delay={60} />
        <StatCard label="Total Saved" prefix="₹" value={stats.saved} change="earnings" positive={stats.saved > 0} icon={TrendingUp} delay={120} />
        <StatCard label="Your Rating" value={stats.rating || 0} suffix="star" icon={Star} delay={180} />
      </div>

      {/* Upcoming Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Upcoming Trips</h3>
          <Link href="/trips" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
            View All <ChevronRight size={12} />
          </Link>
        </div>
        <div>
          {upcomingTrips.length > 0 ? (
            upcomingTrips.map((trip, idx) => (
              <TripRow 
                key={idx}
                from={trip.from}
                to={trip.to}
                segment={trip.segment}
                date={trip.date}
                time={trip.time}
                seats={trip.seats}
                status={trip.status}
                role={trip.role}
                tripId={trip.id}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">No upcoming trips</p>
              <Link href="/search?returnTo=/dashboard">
                <button className="mt-2 text-blue-600 text-sm hover:underline">
                  Find a ride →
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* CTA CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/host">
          <div className="group relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 overflow-hidden cursor-pointer shadow-lg shadow-blue-200 hover:shadow-xl transition-all hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <Car size={18} className="text-white" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">Host a Ride</h3>
              <p className="text-blue-200 text-xs mb-4">Share your journey, earn money.</p>
              <span className="text-white text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                Post a trip <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </Link>

        <Link href="/search?returnTo=/dashboard">
          <div className="group bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-3 transition">
                <Search size={18} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Find a Ride</h3>
              <p className="text-gray-400 text-xs mb-4">Join a trip in your direction.</p>
              <span className="text-blue-600 text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                Search rides <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}