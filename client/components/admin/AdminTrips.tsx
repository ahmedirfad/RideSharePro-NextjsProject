'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Eye, Pencil, XCircle,
  ChevronLeft, ChevronRight, Calendar, CheckCircle,
  AlertCircle, Car, Clock, MoreHorizontal, Loader2,
} from 'lucide-react'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trip {
  id: string
  tripId: string
  route: { from: string; to: string; via?: string }
  driver: { 
    id: string
    name: string
    avatar: string
    rating: number
    online: boolean
    isVerified: boolean
  }
  date: string
  time: string
  seats: { booked: number; total: number }
  distanceKm: number
  farePerSeat: number
  status: 'Ongoing' | 'Upcoming' | 'Cancelled' | 'Completed'
  rawStatus: string
  womenOnly: boolean
  vehicleInfo: string  // 👈 ADDED
}

interface TripStats {
  todayTrips: number
  activeTrips: number
  completedToday: number
  cancelledToday: number
  totalTrips: number
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Ongoing:   { pill: 'bg-green-500/15 text-green-400 border-green-500/25',  bar: 'bg-green-500',  icon: Car         },
  Upcoming:  { pill: 'bg-blue-500/15 text-blue-400 border-blue-500/25',     bar: 'bg-blue-500',   icon: Clock       },
  Cancelled: { pill: 'bg-red-500/15 text-red-400 border-red-500/25',        bar: 'bg-red-500',    icon: XCircle     },
  Completed: { pill: 'bg-gray-500/15 text-gray-400 border-gray-500/25',     bar: 'bg-gray-400',   icon: CheckCircle },
}

const PER_PAGE = 8

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, iconColor, borderColor, loading,
}: {
  icon: any; label: string; value: number | string
  iconColor: string; borderColor: string; loading?: boolean
}) {
  return (
    <div className={`flex items-center gap-3 bg-[#13172a] border rounded-xl px-4 py-3.5 flex-1 min-w-0 ${borderColor}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-semibold leading-none mb-1.5 uppercase tracking-wide">
          {label}
        </p>
        {loading ? (
          <div className="h-6 w-16 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="text-xl font-black text-white leading-none" style={{ fontFamily: "'Outfit',sans-serif" }}>
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

function SeatBar({ booked, total, status }: { booked: number; total: number; status: Trip['status'] }) {
  const pct = total === 0 ? 0 : Math.round((booked / total) * 100)
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${STATUS_CONFIG[status].bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 shrink-0 w-8 text-right">{pct}%</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [stats, setStats] = useState<TripStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search,     setSearch]     = useState('')
  const [fromCity,   setFromCity]   = useState('')
  const [toCity,     setToCity]     = useState('')
  const [dateRange,  setDateRange]  = useState('')
  const [statusFilt, setStatusFilt] = useState('All Statuses')
  const [driverSrch, setDriverSrch] = useState('')
  const [selected,   setSelected]   = useState<string[]>([])
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total,      setTotal]      = useState(0)

  // ── Debounce search ──────────────────────────────────────────────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setPage(1), 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, fromCity, toCity, dateRange, statusFilt, driverSrch])

  // ── Fetch trips ──────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PER_PAGE),
      }
      if (search) params.search = search
      if (fromCity) params.fromCity = fromCity
      if (toCity) params.toCity = toCity
      if (dateRange) params.date = dateRange
      if (statusFilt !== 'All Statuses') params.status = statusFilt
      if (driverSrch) params.driverName = driverSrch

      const res = await api.get('/admin/trips', { params })
      if (res.data.success) {
        setTrips(res.data.data || [])
        setTotalPages(res.data.pagination?.totalPages || 1)
        setTotal(res.data.pagination?.total || 0)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load trips')
      console.error('Fetch trips error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, fromCity, toCity, dateRange, statusFilt, driverSrch])

  // ── Fetch stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/trips/stats')
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch (err) {
      console.error('Fetch stats error:', err)
    }
  }, [])

  useEffect(() => {
    fetchTrips()
    fetchStats()
  }, [fetchTrips, fetchStats])

  const resetFilters = () => {
    setSearch(''); setFromCity(''); setToCity('')
    setDateRange(''); setStatusFilt('All Statuses'); setDriverSrch('')
    setPage(1)
  }

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () =>
    setSelected(s => s.length === trips.length ? [] : trips.map(t => t.id))

  // ── Pagination page numbers ───────────────────────────────────────────────
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    let p = i + 1
    if (totalPages > 5 && page > 3) {
      p = page - 2 + i
      if (p > totalPages) p = totalPages - (4 - i)
    }
    if (p < 1 || p > totalPages) return null
    return p
  }).filter(Boolean) as number[]

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Trip Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Monitor, manage and dispatch all platform trips.</p>
        </div>
        <Link href="/admin/trips/new">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-900/40 active:scale-95">
            <Plus size={15} /> Create Trip
          </button>
        </Link>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">
          {error}
          <button onClick={fetchTrips} className="ml-2 underline hover:no-underline">Retry</button>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          icon={Calendar}    label="Today's Trips"    
          value={stats?.todayTrips || 0}     
          iconColor="bg-blue-500/20 text-blue-400"   
          borderColor="border-white/8" 
          loading={loading} 
        />
        <StatCard 
          icon={Car}         label="Currently Active" 
          value={stats?.activeTrips || 0}    
          iconColor="bg-green-500/20 text-green-400" 
          borderColor="border-green-500/20" 
          loading={loading} 
        />
        <StatCard 
          icon={CheckCircle} label="Completed Today"  
          value={stats?.completedToday || 0} 
          iconColor="bg-gray-500/20 text-gray-400"   
          borderColor="border-white/8" 
          loading={loading} 
        />
        <StatCard 
          icon={AlertCircle} label="Cancelled Today"  
          value={stats?.cancelledToday || 0} 
          iconColor="bg-red-500/20 text-red-400"     
          borderColor="border-red-500/20" 
          loading={loading} 
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">From City</label>
            <input
              value={fromCity}
              onChange={e => setFromCity(e.target.value)}
              placeholder="Enter origin"
              className="bg-[#0f1117] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">To City</label>
            <input
              value={toCity}
              onChange={e => setToCity(e.target.value)}
              placeholder="Enter destination"
              className="bg-[#0f1117] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className="bg-[#0f1117] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-400 outline-none focus:border-blue-500/50 transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Status</label>
            <select
              value={statusFilt}
              onChange={e => setStatusFilt(e.target.value)}
              className="bg-[#0f1117] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500/50 transition appearance-none cursor-pointer"
            >
              {['All Statuses', 'Ongoing', 'Upcoming', 'Completed', 'Cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Driver Search</label>
            <input
              value={driverSrch}
              onChange={e => setDriverSrch(e.target.value)}
              placeholder="Driver name..."
              className="bg-[#0f1117] border border-white/8 rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/50 transition"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/5">
          <p className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <AlertCircle size={11} /> Showing filtered results for current selection
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-white/8 hover:border-white/20 rounded-lg transition font-semibold"
            >
              Reset
            </button>
            <button 
              onClick={fetchTrips}
              className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">

        {/* Table topbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 gap-4">
          <div className="relative max-w-xs w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by trip, driver, or passenger..."
              className="w-full bg-[#0f1117] border border-white/8 rounded-xl pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-blue-500/40 transition"
            />
          </div>
          {selected.length > 0 && (
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-gray-400">{selected.length} selected</span>
              <button className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition border border-red-500/20">
                Cancel Selected
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
            <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <th className="px-5 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === trips.length && trips.length > 0}
                    onChange={toggleAll}
                    className="accent-blue-600 cursor-pointer w-3.5 h-3.5"
                  />
                </th>
                <th className="px-4 py-3 text-left">Trip ID</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Date & Time</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Distance</th>
                <th className="px-4 py-3 text-left">Fare</th>
                <th className="px-4 py-3 text-left">Vehicle</th>  {/* 👈 NEW COLUMN */}
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-600">
                      <Car size={28} />
                      <p className="text-sm font-semibold">No trips match your filters</p>
                      <button onClick={resetFilters} className="text-xs text-blue-400 hover:underline mt-1">
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : trips.map(trip => {
                const sc = STATUS_CONFIG[trip.status]
                const isSelected = selected.includes(trip.id)

                return (
                  <tr
                    key={trip.id}
                    className={`group transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-white/[0.02]'}`}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(trip.id)}
                        className="accent-blue-600 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>

                    {/* Trip ID */}
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-mono text-gray-500">
                        #{String(trip.id).slice(-8).toUpperCase()}
                      </span>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-gray-200 whitespace-nowrap">
                        {trip.route.from} → {trip.route.to}
                      </p>
                      {trip.route.via && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded border border-blue-500/20">
                          {trip.route.via}
                        </span>
                      )}
                    </td>

                    {/* Driver */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[9px] font-bold flex items-center justify-center">
                            {trip.driver.avatar}
                          </div>
                          {trip.driver.isVerified && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#13172a]" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-200 leading-none">{trip.driver.name}</p>
                          {trip.driver.rating > 0 && (
                            <p className="text-[10px] text-amber-400 mt-0.5">★ {trip.driver.rating}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-300 whitespace-nowrap">
                        {new Date(trip.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{trip.time}</p>
                    </td>

                    {/* Seats */}
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-gray-300 mb-1.5">
                        {trip.seats.booked}/{trip.seats.total}
                      </p>
                      <SeatBar booked={trip.seats.booked} total={trip.seats.total} status={trip.status} />
                    </td>

                    {/* Distance */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-400">{trip.distanceKm} km</span>
                    </td>

                    {/* Fare */}
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold text-gray-200">₹{trip.farePerSeat}/seat</span>
                    </td>

                    {/* 👇 VEHICLE COLUMN */}
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-400">
                        {trip.vehicleInfo || '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sc.pill}`}>
                        {trip.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/trips/${trip.id}`}>
                          <button
                            title="View"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition"
                          >
                            <Eye size={13} />
                          </button>
                        </Link>
                        <Link href={`/admin/trips/${trip.id}/edit`}>
                          <button
                            title="Edit"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition"
                          >
                            <Pencil size={13} />
                          </button>
                        </Link>
                        {(trip.status === 'Ongoing' || trip.status === 'Upcoming') && (
                          <button
                            title="Cancel trip"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                        {(trip.status === 'Completed' || trip.status === 'Cancelled') && (
                          <button
                            title="More"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
          <p className="text-[11px] text-gray-500">
            {loading ? 'Loading...' : total === 0 ? 'No results' : 
              `Showing ${(page - 1) * PER_PAGE + 1}–${Math.min(page * PER_PAGE, total)} of ${total} results`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/8 text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={13} />
            </button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                  page === p
                    ? 'bg-blue-600 text-white'
                    : 'border border-white/8 text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}

            {totalPages > 5 && page < totalPages - 2 && (
              <span className="w-7 h-7 flex items-center justify-center text-xs text-gray-600">…</span>
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/8 text-gray-400 hover:text-white hover:bg-white/5 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}