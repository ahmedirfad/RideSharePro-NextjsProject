'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import dynamic from 'next/dynamic'
import {
  Search, Download, ChevronLeft, ChevronRight, X, Loader2,
  Lock, Unlock, RotateCcw, AlertTriangle, Wallet, TrendingUp,
  TrendingDown, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  ArrowLeft, Send
} from 'lucide-react'
import api from '@/lib/api'

// Recharts — client-side only
const AreaChart  = dynamic(() => import('recharts').then(m => ({ default: m.AreaChart  })), { ssr: false })
const Area       = dynamic(() => import('recharts').then(m => ({ default: m.Area       })), { ssr: false })
const BarChart   = dynamic(() => import('recharts').then(m => ({ default: m.BarChart   })), { ssr: false })
const Bar        = dynamic(() => import('recharts').then(m => ({ default: m.Bar        })), { ssr: false })
const XAxis      = dynamic(() => import('recharts').then(m => ({ default: m.XAxis      })), { ssr: false })
const YAxis      = dynamic(() => import('recharts').then(m => ({ default: m.YAxis      })), { ssr: false })
const Tooltip    = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip    })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false })
const Cell       = dynamic(() => import('recharts').then(m => ({ default: m.Cell       })), { ssr: false })

// ─── Types ────────────────────────────────────────────────
interface Booking {
  id: string
  shortId: string
  passenger: string
  driver: string
  route: string
  date: string
  fare: number
  platformFee: number
  status: string
  paymentStatus: string
  escrowStatus: string
  refundAmount: number
  refundReason: string
}

interface Stats {
  totalBookings: number
  bookingsGrowth: number
  confirmedCount: number
  successRate: number
  cancelledCount: number
  topCancelledRoute: string
  escrowHeldTotal: number
  disputedCount: number
  platformRevenue: number
  feeRatePct: number
}

interface ChartData {
  bookingsPerDay: { date: string; count: number }[]
  revenueBreakdown: { month: string; revenue: number }[]
}

const ESCROW_OPTIONS = [
  { value: 'held',      label: 'Held',      color: 'text-amber-400' },
  { value: 'released',  label: 'Released',  color: 'text-green-400' },
  { value: 'disputed',  label: 'Disputed',  color: 'text-red-400'   },
  { value: 'refunded',  label: 'Refunded',  color: 'text-gray-400'  },
]

const ESCROW_BADGE: Record<string, string> = {
  held:     'bg-amber-500/15 text-amber-400',
  released: 'bg-green-500/15 text-green-400',
  disputed: 'bg-red-500/15 text-red-400',
  refunded: 'bg-gray-500/15 text-gray-400',
}

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partial Refund',
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ', ' + new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ─── Chart tooltips ─────────────────────────────────────────
function CountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2333] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-blue-400">{payload[0].value} bookings</p>
    </div>
  )
}
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2333] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-green-400">{formatINR(payload[0].value)}</p>
    </div>
  )
}

// ─── KPI card ────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconColor, trend }: {
  label: string; value: string; sub: string; icon: any; iconColor: string
  trend?: { up: boolean; text: string }
}) {
  return (
    <div className="bg-[#13172a] border border-white/8 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={16} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            trend.up ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {trend.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{trend.text}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Outfit',sans-serif" }}>{value}</p>
      <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
      <p className="text-[11px] text-gray-600 mt-1">{sub}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════
export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')
  const [escrowStatuses, setEscrowStatuses] = useState<string[]>(['held', 'released', 'disputed', 'refunded'])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minFare, setMinFare] = useState('')
  const [maxFare, setMaxFare] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  const [exporting, setExporting] = useState(false)
  const [refundOpenId, setRefundOpenId] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchInput])

  const buildParams = useCallback(() => {
    const params: Record<string, string> = {
      search, paymentStatus,
      escrowStatus: escrowStatuses.length === 4 ? 'all' : escrowStatuses.join(','),
    }
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (minFare) params.minFare = minFare
    if (maxFare) params.maxFare = maxFare
    return params
  }, [search, paymentStatus, escrowStatuses, dateFrom, dateTo, minFare, maxFare])

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/bookings', {
        params: { ...buildParams(), page: String(page), limit: String(limit) },
      })
      if (res.data.success) {
        setBookings(res.data.data.bookings)
        setTotalPages(res.data.data.pagination.totalPages)
        setTotal(res.data.data.pagination.total)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [buildParams, page])

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/bookings/stats')
      if (res.data.success) setStats(res.data.data)
    } catch { /* silent */ }
  }, [])

  const fetchCharts = useCallback(async () => {
    setChartsLoading(true)
    try {
      const res = await api.get('/admin/bookings/charts')
      if (res.data.success) setCharts(res.data.data)
    } catch { /* silent */ } finally {
      setChartsLoading(false)
    }
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { fetchStats(); fetchCharts() }, [fetchStats, fetchCharts])

  const toggleEscrow = (val: string) => {
    setPage(1)
    setEscrowStatuses((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    )
  }

  const resetFilters = () => {
    setSearchInput(''); setSearch('')
    setPaymentStatus('all')
    setEscrowStatuses(['held', 'released', 'disputed', 'refunded'])
    setDateFrom(''); setDateTo('')
    setMinFare(''); setMaxFare('')
    setPage(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get('/admin/bookings/export', { params: buildParams(), responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to export bookings')
    } finally {
      setExporting(false)
    }
  }

  const openRefund = (b: Booking) => {
    setRefundOpenId(b.id)
    setRefundAmount(String(b.fare))
    setRefundReason('')
  }

  const closeRefund = () => {
    setRefundOpenId(null)
    setRefundAmount('')
    setRefundReason('')
  }

  const submitRefund = async (id: string) => {
    if (!refundAmount || !refundReason.trim()) {
      alert('Enter a refund amount and reason')
      return
    }
    setActionLoadingId(id)
    try {
      const res = await api.put(`/admin/bookings/${id}/refund`, {
        amount: parseFloat(refundAmount), reason: refundReason.trim(),
      })
      if (res.data.success) {
        closeRefund()
        fetchBookings()
        fetchStats()
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to process refund')
    } finally {
      setActionLoadingId(null)
    }
  }

  const releaseEscrow = async (id: string) => {
    if (!confirm('Release held funds to the driver? This cannot be undone.')) return
    setActionLoadingId(id)
    try {
      const res = await api.put(`/admin/bookings/${id}/release-escrow`)
      if (res.data.success) {
        fetchBookings()
        fetchStats()
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to release escrow')
    } finally {
      setActionLoadingId(null)
    }
  }

  const hasActiveFilters = search || paymentStatus !== 'all' || escrowStatuses.length !== 4 ||
    dateFrom || dateTo || minFare || maxFare

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>Bookings & Payments</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage fleet transactions and escrow releases.</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition disabled:opacity-50">
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          key="total-bookings"
          label="Total Bookings"
          value={stats ? stats.totalBookings.toLocaleString('en-IN') : '—'}
          sub={stats ? `${stats.bookingsGrowth >= 0 ? '+' : ''}${stats.bookingsGrowth}% from last month` : ''}
          icon={Wallet} iconColor="bg-blue-500/15 text-blue-400"
          trend={stats ? { up: stats.bookingsGrowth >= 0, text: `${Math.abs(stats.bookingsGrowth)}%` } : undefined}
        />
        <StatCard
          key="confirmed"
          label="Confirmed"
          value={stats ? stats.confirmedCount.toLocaleString('en-IN') : '—'}
          sub={stats ? `${stats.successRate}% success rate` : ''}
          icon={CheckCircle2} iconColor="bg-green-500/15 text-green-400"
        />
        <StatCard
          key="cancelled"
          label="Cancelled"
          value={stats ? stats.cancelledCount.toLocaleString('en-IN') : '—'}
          sub={stats ? `High: ${stats.topCancelledRoute}` : ''}
          icon={XCircle} iconColor="bg-red-500/15 text-red-400"
        />
        <StatCard
          key="escrow-held"
          label="Escrow Held"
          value={stats ? formatINR(stats.escrowHeldTotal) : '—'}
          sub={stats ? `${stats.disputedCount} disputed` : ''}
          icon={Lock} iconColor="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          key="platform-revenue"
          label="Platform Revenue"
          value={stats ? formatINR(stats.platformRevenue) : '—'}
          sub={stats ? `${stats.feeRatePct}% fee average` : ''}
          icon={TrendingUp} iconColor="bg-purple-500/15 text-purple-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div key="bookings-chart" className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5">
            <span className="text-sm font-bold text-white">Bookings per day — last 30 days</span>
          </div>
          <div className="p-5" style={{ height: '220px' }}>
            {chartsLoading || !charts ? (
              <div className="h-full flex items-center justify-center"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.bookingsPerDay}>
                  <defs>
                    <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 9 }} axisLine={false} tickLine={false}
                    interval={4} />
                  <YAxis hide />
                  <Tooltip content={<CountTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#bookingGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div key="revenue-chart" className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5">
            <span className="text-sm font-bold text-white">Revenue Breakdown — last 6 months</span>
          </div>
          <div className="p-5" style={{ height: '220px' }}>
            {chartsLoading || !charts ? (
              <div className="h-full flex items-center justify-center"><Loader2 size={20} className="animate-spin text-blue-500" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revenueBreakdown} barSize={28}>
                  <XAxis dataKey="month" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {charts.revenueBreakdown.map((_, i) => (
                      <Cell key={i} fill={i === charts.revenueBreakdown.length - 1 ? '#22c55e' : '#15803d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">

        {/* Filters sidebar */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-4 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Filters</span>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[10px] text-blue-400 hover:underline font-semibold">Reset All</button>
            )}
          </div>

          {/* Search */}
          <div key="search-filter">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Search</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ID, passenger, driver..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              />
            </div>
          </div>

          {/* Payment status */}
          <div key="payment-filter">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Payment Status</label>
            <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition">
              <option value="all" className="bg-[#13172a]">All Statuses</option>
              {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                <option key={val} value={val} className="bg-[#13172a]">{label}</option>
              ))}
            </select>
          </div>

          {/* Escrow status */}
          <div key="escrow-filter">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-2">Escrow Status</label>
            <div className="space-y-1.5">
              {ESCROW_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={escrowStatuses.includes(opt.value)}
                    onChange={() => toggleEscrow(opt.value)}
                    className="w-3.5 h-3.5 rounded accent-blue-600 bg-white/5 border-white/20"
                  />
                  <span className={`text-xs font-medium ${opt.color} group-hover:opacity-80 transition`}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div key="date-filter">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Date Range</label>
            <div className="space-y-2">
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
          </div>

          {/* Fare range */}
          <div key="fare-filter">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
              Fare Range <span className="text-gray-600 font-normal">(₹)</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="Min" value={minFare}
                onChange={(e) => { setMinFare(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
              <span className="text-gray-600 text-xs">–</span>
              <input type="number" min="0" placeholder="Max" value={maxFare}
                onChange={(e) => { setMaxFare(e.target.value); setPage(1) }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/20 p-3 text-red-400 text-sm">
              {error}
              <button onClick={fetchBookings} className="ml-2 underline hover:no-underline">Try again</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  <th className="text-left px-5 py-3">Booking ID</th>
                  <th className="text-left px-4 py-3">Passenger</th>
                  <th className="text-left px-4 py-3">Driver</th>
                  <th className="text-left px-4 py-3">Route</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Fare</th>
                  <th className="text-left px-4 py-3">Escrow</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                  </td></tr>
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No bookings found matching your filters.
                  </td></tr>
                ) : (
                  bookings.map((b) => (
                    <Fragment key={b.id}>
                      <tr className="hover:bg-white/3 transition group">
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-mono text-gray-400">#{b.shortId}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {b.passenger.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-xs text-gray-300">{b.passenger}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {b.driver.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-xs text-gray-300">{b.driver}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-gray-200 whitespace-nowrap">{b.route}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(b.date)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-bold text-gray-200">{formatINR(b.fare)}</p>
                          <p className="text-[10px] text-gray-600">Fee: {formatINR(b.platformFee)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ESCROW_BADGE[b.escrowStatus]}`}>
                            {b.escrowStatus}
                          </span>
                          {b.refundAmount > 0 && (
                            <p className="text-[10px] text-gray-600 mt-0.5">Refunded {formatINR(b.refundAmount)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {b.escrowStatus === 'held' && (
                              <button
                                onClick={() => releaseEscrow(b.id)}
                                disabled={actionLoadingId === b.id}
                                title="Release escrow to driver"
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-green-400 hover:bg-green-500/10 rounded-lg transition disabled:opacity-50"
                              >
                                {actionLoadingId === b.id ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                                Release
                              </button>
                            )}
                            {(b.escrowStatus === 'held' || b.escrowStatus === 'disputed') && (
                              <button
                                onClick={() => refundOpenId === b.id ? closeRefund() : openRefund(b)}
                                title="Process refund"
                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              >
                                <RotateCcw size={11} /> Refund
                              </button>
                            )}
                            {(b.escrowStatus === 'released' || b.escrowStatus === 'refunded') && (
                              <span className="text-[10px] text-gray-600 px-2">No actions</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline refund form */}
                      {refundOpenId === b.id && (
                        <tr key={`${b.id}-refund`} className="bg-red-500/5 border-y border-red-500/20">
                          <td colSpan={8} className="px-5 py-4">
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider shrink-0">
                                <ArrowLeft size={14} /> Process Refund — #{b.shortId}
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Amount (₹)</label>
                                <input
                                  type="number" min="0" max={b.fare} value={refundAmount}
                                  onChange={(e) => setRefundAmount(e.target.value)}
                                  className="w-28 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
                                />
                              </div>
                              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Reason</label>
                                <input
                                  type="text" placeholder="e.g. Trip cancelled by driver" value={refundReason}
                                  onChange={(e) => setRefundReason(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
                                />
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={closeRefund}
                                  className="px-3 py-1.5 text-xs font-semibold text-gray-400 border border-white/10 rounded-lg hover:bg-white/5 transition">
                                  Cancel
                                </button>
                                <button onClick={() => submitRefund(b.id)} disabled={actionLoadingId === b.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50">
                                  {actionLoadingId === b.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                  Confirm Refund
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/5">
            <span className="text-[11px] text-gray-500">
              {total === 0 ? 'No results' : `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total.toLocaleString('en-IN')} results`}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-white disabled:opacity-30 transition">
                <ChevronLeft size={12} /> Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1
                if (totalPages > 5 && page > 3) {
                  p = page - 2 + i
                  if (p > totalPages) p = totalPages - (4 - i)
                }
                if (p < 1 || p > totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg transition ${
                      page === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'
                    }`}>{p}</button>
                )
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-white disabled:opacity-30 transition">
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}