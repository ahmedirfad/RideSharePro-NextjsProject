'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Car, Users, Star, Download, Calendar,
  ChevronRight, ArrowUpRight, ArrowDownRight, Wallet,
  CreditCard, Shield, Clock, CheckCircle, XCircle,
  Loader2, AlertCircle, BarChart2, Filter,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useSocket } from '@/hooks/useSocket'
import { useNotifications } from '@/hooks/useNotifications'

// ─── Types ────────────────────────────────────────────────────────────────────
interface EarningEntry {
  id: string
  type: 'HOST' | 'GUEST'
  route: string
  date: string
  rawDate: Date
  month: string
  amount: number
  platformFee: number
  net: number
  status: string
  seats?: number
  distanceKm?: number
  driverName?: string
}

interface MonthSummary {
  month: string
  trips: number
  grossEarned: number
  platformFees: number
  netEarned: number
  spent: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseAmount(str: string): number {
  return parseInt((str || '₹0').replace(/[₹,]/g, '')) || 0
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

function getMonthKey(dateStr: string): string {
  try {
    const parts = dateStr.split(' ')
    if (parts.length === 3) return `${parts[1]} ${parts[2]}`
    return dateStr
  } catch { return dateStr }
}

function toRawDate(dateStr: string): Date {
  try { return new Date(dateStr) } catch { return new Date() }
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full">
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${d.color}`}
              style={{ height: `${Math.max((d.value / max) * 64, 4)}px` }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
              {fmtINR(d.value)}
            </div>
          </div>
          <p className="text-[8px] text-gray-400 font-medium truncate w-full text-center">{d.label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, trend, trendUp,
}: {
  label: string; value: string; sub?: string; icon: any
  accent: string; trend?: string; trendUp?: boolean
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      {trend && (
        <p className={`text-xs font-medium flex items-center gap-1 mt-1.5 ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {trend}
        </p>
      )}
    </div>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ entry }: { entry: EarningEntry }) {
  const isHost = entry.type === 'HOST'
  const statusColor = entry.status === 'COMPLETED' || entry.status === 'UPCOMING' || entry.status === 'CONFIRMED'
    ? 'text-emerald-600 bg-emerald-50'
    : entry.status === 'CANCELLED'
    ? 'text-red-500 bg-red-50'
    : 'text-amber-600 bg-amber-50'

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isHost ? 'bg-blue-100' : 'bg-purple-100'
      }`}>
        {isHost
          ? <Car size={15} className="text-blue-600" />
          : <Users size={15} className="text-purple-600" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{entry.route}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isHost ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
          }`}>
            {isHost ? 'Hosted' : 'Travelled'}
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar size={9} /> {entry.date}
          </span>
          {entry.distanceKm && (
            <span className="text-[10px] text-gray-400">{entry.distanceKm} km</span>
          )}
          {!isHost && entry.driverName && (
            <span className="text-[10px] text-gray-400">Driver: {entry.driverName}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {isHost ? (
          <>
            <p className="text-sm font-black text-emerald-600">+{fmtINR(entry.net)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Gross {fmtINR(entry.amount)} − fee {fmtINR(entry.platformFee)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-black text-red-500">−{fmtINR(entry.amount)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">incl. {fmtINR(entry.platformFee)} platform fee</p>
          </>
        )}
      </div>

      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${statusColor}`}>
        {entry.status}
      </span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Earnings() {
  const { isAuthenticated } = useAuthStore()
  const socket = useSocket()
  const { notifications } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [entries, setEntries] = useState<EarningEntry[]>([])
  const [view, setView] = useState<'week' | 'month' | 'year'>('month')
  const [filterType, setFilterType] = useState<'all' | 'HOST' | 'GUEST'>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [newPayoutAlert, setNewPayoutAlert] = useState(false)

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEarnings = async () => {
    if (!isAuthenticated) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const res = await api.get('/trips/my-trips/all')
      if (!res.data.success) throw new Error('Failed')

      const all: any[] = res.data.data.all || []
      const parsed: EarningEntry[] = []

      for (const t of all) {
        const gross = parseAmount(t.amount)
        const fee = Math.round(gross * 0.05)
        const net = gross - fee

        parsed.push({
          id:          t.tripId || t.id || String(Math.random()),
          type:        t.role as 'HOST' | 'GUEST',
          route:       t.route || `${t.fromName} → ${t.toName}`,
          date:        t.date,
          rawDate:     toRawDate(t.date),
          month:       getMonthKey(t.date),
          amount:      gross,
          platformFee: fee,
          net:         net,
          status:      t.status,
          seats:       t.seats?.booked || 1,
          distanceKm:  t.distanceKm,
          driverName:  t.driver?.name,
        })
      }

      parsed.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      setEntries(parsed)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load earnings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [isAuthenticated])

  // ─── Listen for real-time updates ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const handleNewBooking = (data: any) => {
      // Refresh earnings when a booking is confirmed (new earning)
      fetchEarnings()
    }

    const handlePaymentReleased = (data: any) => {
      // Show alert when escrow is released (new payout)
      setNewPayoutAlert(true)
      fetchEarnings()
      setTimeout(() => setNewPayoutAlert(false), 5000)
    }

    const handleTripCompleted = (data: any) => {
      // Refresh when trip is completed (earning finalized)
      fetchEarnings()
    }

    socket.on('booking:confirmed', handleNewBooking)
    socket.on('escrow:released', handlePaymentReleased)
    socket.on('trip:completed', handleTripCompleted)

    return () => {
      socket.off('booking:confirmed', handleNewBooking)
      socket.off('escrow:released', handlePaymentReleased)
      socket.off('trip:completed', handleTripCompleted)
    }
  }, [socket])

  // ─── Check notifications for payment updates ──────────────────────────────
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotif = notifications[0]
      if (latestNotif.type === 'escrow_released' || latestNotif.type === 'refund_processed') {
        fetchEarnings()
        setNewPayoutAlert(true)
        setTimeout(() => setNewPayoutAlert(false), 5000)
      }
    }
  }, [notifications])

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const { hostEntries, guestEntries, months, chartData, monthlySummaries, topRoute, bestMonth } = useMemo(() => {
    const hostEntries  = entries.filter(e => e.type === 'HOST'  && e.status !== 'CANCELLED')
    const guestEntries = entries.filter(e => e.type === 'GUEST' && e.status !== 'CANCELLED')

    const months = [...new Set(entries.map(e => e.month))]

    const monthlySummaries: MonthSummary[] = months.map(month => {
      const hm = hostEntries.filter(e => e.month === month)
      const gm = guestEntries.filter(e => e.month === month)
      const gross = hm.reduce((s, e) => s + e.amount, 0)
      const fees  = hm.reduce((s, e) => s + e.platformFee, 0)
      return {
        month,
        trips:        hm.length + gm.length,
        grossEarned:  gross,
        platformFees: fees,
        netEarned:    gross - fees,
        spent:        gm.reduce((s, e) => s + e.amount, 0),
      }
    })

    const chartData = [...monthlySummaries].slice(0, 7).reverse().map(s => ({
      label: s.month.split(' ')[0].slice(0, 3),
      value: s.netEarned,
      color: 'bg-blue-500',
    }))

    const routeMap: Record<string, number> = {}
    hostEntries.forEach(e => { routeMap[e.route] = (routeMap[e.route] || 0) + e.net })
    const topRoute = Object.entries(routeMap).sort((a, b) => b[1] - a[1])[0]

    const bestMonth = [...monthlySummaries].sort((a, b) => b.netEarned - a.netEarned)[0]

    return { hostEntries, guestEntries, months, chartData, monthlySummaries, topRoute, bestMonth }
  }, [entries])

  const totalNetEarned  = hostEntries.reduce((s, e) => s + e.net, 0)
  const totalGross      = hostEntries.reduce((s, e) => s + e.amount, 0)
  const totalFees       = hostEntries.reduce((s, e) => s + e.platformFee, 0)
  const totalSpent      = guestEntries.reduce((s, e) => s + e.amount, 0)
  const totalTripsHosted = hostEntries.length
  const avgPerTrip      = totalTripsHosted > 0 ? Math.round(totalNetEarned / totalTripsHosted) : 0
  const netBalance      = totalNetEarned - totalSpent

  const displayed = entries.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false
    if (filterMonth !== 'all' && e.month !== filterMonth) return false
    return true
  })

  const handleExport = () => {
    const headers = ['Date','Route','Type','Gross','Platform Fee','Net','Status','Distance']
    const rows = displayed.map(e => [
      e.date, e.route, e.type,
      e.amount, e.platformFee,
      e.type === 'HOST' ? e.net : -e.amount,
      e.status, e.distanceKm || '',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={32} className="text-blue-500 animate-spin" />
      <p className="text-gray-500 text-sm">Loading earnings...</p>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
      <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  )

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Earnings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your income, fees, and travel spend</p>
        </div>
        <div className="flex items-center gap-3">
          {newPayoutAlert && (
            <span className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full animate-pulse">
              New payout received!
            </span>
          )}
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition shadow-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Hero earnings card ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap gap-8 items-end justify-between">
          <div>
            <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Total Net Earnings (Host)</p>
            <p className="text-5xl font-black tracking-tight leading-none">{fmtINR(totalNetEarned)}</p>
            <p className="text-blue-200 text-sm mt-2">
              Gross {fmtINR(totalGross)} − platform fees {fmtINR(totalFees)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${
              netBalance >= 0
                ? 'bg-emerald-500/20 border-emerald-400/30'
                : 'bg-red-500/20 border-red-400/30'
            }`}>
              <Wallet size={14} className={netBalance >= 0 ? 'text-emerald-300' : 'text-red-300'} />
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider font-bold">Net Balance</p>
                <p className={`text-base font-black ${netBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {netBalance >= 0 ? '+' : ''}{fmtINR(netBalance)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-blue-300 text-right">
              Earned {fmtINR(totalNetEarned)} − Spent {fmtINR(totalSpent)}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          {[
            { label: 'AVG PER TRIP', value: fmtINR(avgPerTrip), icon: TrendingUp },
            { label: 'TRIPS HOSTED', value: String(totalTripsHosted), icon: Car },
            { label: 'HIGHEST EARNING', value: topRoute ? fmtINR(topRoute[1]) : '—', icon: Star },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Icon size={14} className="text-white" />
              </div>
              <p className="text-xs text-blue-200 uppercase tracking-widest font-bold">{label}</p>
              <p className="text-xl font-black text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Host Earnings (net)" value={fmtINR(totalNetEarned)}
          sub={`${totalTripsHosted} trips hosted`}
          icon={Car} accent="bg-blue-100 text-blue-600"
          trend={bestMonth ? `Best: ${fmtINR(bestMonth.netEarned)} in ${bestMonth.month}` : undefined}
          trendUp
        />
        <StatCard
          label="Platform Fees Paid" value={fmtINR(totalFees)}
          sub="5% of gross earnings"
          icon={Shield} accent="bg-gray-100 text-gray-500"
        />
        <StatCard
          label="Passenger Spend" value={fmtINR(totalSpent)}
          sub={`${guestEntries.length} trips taken`}
          icon={Users} accent="bg-purple-100 text-purple-600"
          trend={totalSpent > 0 ? `Avg ${fmtINR(Math.round(totalSpent / Math.max(guestEntries.length, 1)))} per trip` : undefined}
        />
        <StatCard
          label="Net Balance" value={fmtINR(netBalance)}
          sub="Earned minus spent"
          icon={Wallet} accent={netBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}
          trend={netBalance >= 0 ? 'In profit' : 'Spending > Earning'}
          trendUp={netBalance >= 0}
        />
      </div>

      {/* ── Two column: Chart + Recent payouts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Weekly earnings chart */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Monthly Earnings</h3>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['week','month','year'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg transition capitalize ${
                    view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                  }`}>
                  {v === 'week' ? 'Week' : v === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {chartData.length > 0 ? (
              <>
                <BarChart data={chartData} />
                <div className="mt-5 space-y-2">
                  {monthlySummaries.slice(0, 4).map(s => (
                    <div key={s.month} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-medium text-gray-700 w-24 shrink-0">{s.month}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min((s.netEarned / (monthlySummaries[0]?.netEarned || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="font-bold text-gray-900 w-20 text-right">{fmtINR(s.netEarned)}</span>
                      <span className="text-[10px] text-gray-400 w-16 text-right">{s.trips} trips</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">No earnings data yet</div>
            )}
          </div>
        </div>

        {/* Recent payouts + linked bank */}
        <div className="space-y-4">
          {/* Recent payouts */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm">Recent Payouts</h3>
              <span className="text-[10px] text-gray-400">Host trips only</span>
            </div>
            <div className="divide-y divide-gray-50">
              {hostEntries.slice(0, 4).length > 0 ? hostEntries.slice(0, 4).map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{e.route}</p>
                    <p className="text-[10px] text-gray-400">{e.date}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">{fmtINR(e.net)}</span>
                </div>
              )) : (
                <div className="px-4 py-6 text-center text-gray-400 text-xs">No host earnings yet</div>
              )}
            </div>
            {hostEntries.length > 4 && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <button onClick={() => setFilterType('HOST')}
                  className="w-full text-xs text-blue-600 font-semibold hover:underline">
                  View all {hostEntries.length} host trips →
                </button>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Stats</p>
            {[
              { label: 'Completion rate', value: totalTripsHosted > 0 ? `${Math.round((hostEntries.filter(e => e.status === 'COMPLETED').length / totalTripsHosted) * 100)}%` : '—' },
              { label: 'Best earning route', value: topRoute ? topRoute[0].split('→')[0].trim() + ' →...' : '—' },
              { label: 'Best month',  value: bestMonth ? bestMonth.month : '—' },
              { label: 'Total distance', value: `${entries.reduce((s, e) => s + (e.distanceKm || 0), 0).toFixed(0)} km` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm font-bold text-gray-900 truncate max-w-[140px] text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Spend summary */}
          {guestEntries.length > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3">As Passenger</p>
              <p className="text-2xl font-black text-purple-700">{fmtINR(totalSpent)}</p>
              <p className="text-xs text-purple-400 mt-0.5">across {guestEntries.length} trips</p>
              <div className="mt-3 space-y-1.5">
                {guestEntries.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-purple-600 truncate max-w-[140px]">{e.route}</span>
                    <span className="text-purple-800 font-bold">{fmtINR(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Full transaction history ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900">Transaction History</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['all','HOST','GUEST'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-lg transition ${
                    filterType === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'
                  }`}>
                  {f === 'all' ? 'All' : f === 'HOST' ? 'Hosting' : 'Travelling'}
                </button>
              ))}
            </div>
            {months.length > 0 && (
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
                <option value="all">All months</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button onClick={handleExport}
              className="flex items-center gap-1.5 text-xs border border-gray-200 rounded-xl px-3 py-1.5 text-gray-500 hover:bg-gray-50 transition">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] px-5 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <span>Transaction</span>
          <span className="text-right">Amount</span>
        </div>

        <div className="divide-y divide-gray-50">
          {displayed.length > 0 ? (
            displayed.map((e, i) => <TxRow key={i} entry={e} />)
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">
              No transactions match your filters
            </div>
          )}
        </div>

        {displayed.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap justify-between items-center gap-2 text-xs text-gray-500">
            <span>{displayed.length} transaction{displayed.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-4">
              <span>
                Host net: <span className="font-bold text-emerald-600">
                  {fmtINR(displayed.filter(e => e.type === 'HOST').reduce((s, e) => s + e.net, 0))}
                </span>
              </span>
              <span>
                Spent: <span className="font-bold text-red-500">
                  {fmtINR(displayed.filter(e => e.type === 'GUEST').reduce((s, e) => s + e.amount, 0))}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}