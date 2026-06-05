'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, ArrowRight, TrendingUp, Car, Search,
  Clock, Star, ChevronRight, Check, UserCheck,
  Zap, Shield, Users, Award, MapPin,
  Navigation, Activity, Wallet, Calendar, Bell,
} from 'lucide-react'

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
          <span>{change} vs last month</span>
        </p>
      )}
    </div>
  )
}

// ── Trip Row ─────────────────────────────────────────────
function TripRow({ from, to, date, time, seats, status, role }: {
  from: string; to: string; date: string; time: string
  seats: number; status: 'upcoming' | 'confirmed'; role: 'HOST' | 'GUEST'
}) {
  return (
    <Link href="/trips">
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
          </div>
          <p className="font-semibold text-gray-900 text-sm truncate">{from} → {to}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={10} />{time} · {seats} seats</p>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${
          status === 'upcoming' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>{status}</span>
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition shrink-0" />
      </div>
    </Link>
  )
}

// ── Pending Request Card ──────────────────────────────────
function PendingCard({ name, rating, rides, from, to, date, seats }: {
  name: string; rating: number; rides: number
  from: string; to: string; date: string; seats: number
}) {
  const [state, setState] = useState<'idle' | 'accepted' | 'declined'>('idle')
  const initials = name.split(' ').map(n => n[0]).join('')
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{name}</p>
          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <Star size={10} className="text-amber-400 fill-amber-400" />{rating} · {rides} rides
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-800 mb-0.5">{from} → {to}</p>
      <p className="text-xs text-gray-400 mb-3">{date} · {seats} seat</p>
      {state === 'idle' ? (
        <div className="flex gap-2">
          <button onClick={() => setState('declined')}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-white hover:border-gray-300 transition">
            Decline
          </button>
          <button onClick={() => setState('accepted')}
            className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semihover:bg-blue-700 transition shadow-sm shadow-blue-200">
            Accept
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold ${
          state === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <Check size={13} />
          {state === 'accepted' ? 'Accepted' : 'Declined'}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────
export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

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
              Wednesday, May 14, 2026 · Kozhikode
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">Good morning, Ahmed</h1>
            <p className="text-blue-200 text-sm mt-1.5">You have <span className="text-white font-semibold">1 pending request</span> and <span className="text-white font-semibold">2 upcoming trips.</span></p>
          </div>

          {/* Live trip chip */}
          <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur border border-white/20 rounded-2xl px-4 py-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Navigation size={16} className="text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-blue-600" />
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-none">Active Trip</p>
              <p className="text-blue-200 text-[10px] mt-0.5">Kozhikode → Kochi</p>
            </div>
            <Link href="/active-trip/1">
              <div className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1">
                Track <ChevronRight size={11} />
              </div>
            </Link>
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
          <Link href="/active-trip/1">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-2xl border border-white/20 cursor-pointer transition hover:bg-white/20">
              <Navigation size={17} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90">Active Trip</span>
            </div>
          </Link>
          <Link href="/earnings">
            <div className="flex flex-col items-center gap-1.5 py-3 bg-white/10 rounded-2xl border border-white/20 cursor-pointer transition hover:bg-white/20">
              <Wallet size={17} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90">Earnings</span>
            </div>
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Trips Hosted" value={12} change="+14%" positive icon={Car} delay={0} />
        <StatCard label="Trips Taken" value={8} change="0%" icon={Users} delay={60} />
        <StatCard label="Total Saved" prefix="₹" value={6200} change="+22%" positive icon={TrendingUp} delay={120} />
        <StatCard label="Your Rating" value={4.8} suffix="star" icon={Star} delay={180} />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upcoming Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Upcoming Trips</h3>
              <Link href="/trips" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                View All <ChevronRight size={12} />
              </Link>
            </div>
            <div>
              <TripRow from="Kozhikode" to="Kochi" date="MAY 18" time="08:00 AM" seats={3} status="upcoming" role="HOST" />
              <TripRow from="Bengaluru" to="Mysuru" date="MAY 22" time="09:30 AM" seats={2} status="confirmed" role="GUEST" />
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

            <Link href="/search">
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

          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Bookings</h3>
              <span className="text-xs text-gray-400">This week</span>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Ravi Kumar', route: 'Kozhikode → Kochi', rating: 4.9, avatar: 'RK', color: 'from-amber-400 to-orange-400', seats: 1, fare: '₹420' },
                { name: 'Sarah J.', route: 'Bengaluru → Mysuru', rating: 4.7, avatar: 'SJ', color: 'from-purple-400 to-pink-400', seats: 2, fare: '₹840' },
                { name: 'Deepak S.', route: 'Kozhikode → Bangalore', rating: 4.6, avatar: 'DS', color: 'from-blue-400 to-cyan-400', seats: 1, fare: '₹650' },
              ].map((b) => (
                <div key={b.name} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${b.color} text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0`}>
                    {b.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 truncate"><MapPin size={9} />{b.route}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{b.fare}</p>
                    <p className="text-xs text-amber-500 flex items-center gap-0.5 justify-end">
                      <Star size={9} className="fill-amber-400 text-amber-400" />{b.rating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Pending Requests */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Pending Requests</h3>
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
            </div>
            <div className="p-4">
              <PendingCard
                name="Ravi Kumar" rating={4.9} rides={12}
                from="Kozhikode" to="Kochi"
                date="May 18 · 08:00 AM" seats={1}
              />
            </div>
          </div>

          {/* Trust Score */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg shadow-blue-200 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-3 flex items-center gap-1.5">
              <Award size={13} /> Trust Score
            </p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-black leading-none">96</span>
              <div className="pb-1">
                <p className="text-sm font-bold text-white">Excellent</p>
                <p className="text-[10px] text-blue-300">Top 8% of hosts</p>
              </div>
            </div>
            <div className="h-2 bg-white/20 rounded-full mb-4 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: '96%' }} />
            </div>
            <div className="space-y-2.5">
              {[
                { icon: UserCheck, text: 'ID Verified' },
                { icon: Shield, text: 'Insurance Active' },
                { icon: Zap, text: 'Fast Responder' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center shrink-0">
                    <Check size={9} className="text-white" />
                  </div>
                  <span className="text-blue-100">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity size={12} /> Quick Stats
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Response Time</span>
                <span className="text-sm font-bold text-gray-900">2.4 min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Completion Rate</span>
                <span className="text-sm font-bold text-emerald-600">98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Earnings</span>
                <span className="text-sm font-bold text-gray-900">₹12,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Carbon Saved</span>
                <span className="text-sm font-bold text-green-600">48 kg CO₂</span>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-gray-900 rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }} />
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={13} className="text-yellow-400" />
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400">Pro Plan</span>
              </div>
              <p className="text-white text-sm font-semibold mb-1">Unlimited trips, 0% fees</p>
              <p className="text-gray-400 text-xs mb-3">Priority AI matching + verified badge</p>
              <button className="w-full bg-white text-gray-900 text-xs font-bold py-2.5 rounded-xl hover:bg-gray-100 transition">
                Upgrade Now →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}