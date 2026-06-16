'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Users, Car, Wallet, AlertTriangle,
  ChevronRight, ArrowUpRight, ArrowDownRight,
  MoreHorizontal, RefreshCw, Download, Loader2,
  Zap, ShieldCheck, TrendingUp, Leaf,
} from 'lucide-react'
import api from '@/lib/api'

// ─── Recharts (client-side only) ─────────────────────────────────────────────
const BarChart           = dynamic(() => import('recharts').then(m => ({ default: m.BarChart           })), { ssr: false })
const Bar                = dynamic(() => import('recharts').then(m => ({ default: m.Bar                })), { ssr: false })
const XAxis              = dynamic(() => import('recharts').then(m => ({ default: m.XAxis              })), { ssr: false })
const YAxis              = dynamic(() => import('recharts').then(m => ({ default: m.YAxis              })), { ssr: false })
const Tooltip            = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip            })), { ssr: false })
const ResponsiveContainer= dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer})), { ssr: false })
const PieChart           = dynamic(() => import('recharts').then(m => ({ default: m.PieChart           })), { ssr: false })
const Pie                = dynamic(() => import('recharts').then(m => ({ default: m.Pie                })), { ssr: false })
const Cell               = dynamic(() => import('recharts').then(m => ({ default: m.Cell               })), { ssr: false })

// ─── Admin live map (client-side only) ───────────────────────────────────────
const AdminLiveMap = dynamic(() => import('@/components/maps/AdminLiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#0d1117] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-gray-600">
        <Loader2 size={20} className="animate-spin text-blue-500" />
        <span className="text-xs">Loading live map…</span>
      </div>
    </div>
  ),
})

// ─── Types — exactly matching your API response shapes ────────────────────────

// From getAnalyticsOverview → data.kpis
interface Kpis {
  totalRevenue:    number   // gross booking revenue in period
  revenueGrowth:   number   // % vs previous period
  totalTrips:      number   // booking count in period
  tripsGrowth:     number
  newUsers:        number
  usersGrowth:     number
  avgTripValue:    number
  avgRating:       number
  carbonSaved:     number   // kg CO2
  platformRevenue: number   // 5% of gross
}

// From getAnalyticsOverview → data.revenueChart[]
interface RevenuePoint {
  label: string   // "Mon", "Tue" etc.
  gross: number
  fee:   number
}

// From getAnalyticsOverview → data.topRoutes[]
interface TopRoute {
  route:   string
  count:   number
  revenue: number
  pct:     number   // relative to top route (0–100)
}

// From getAnalyticsOverview → data.tripStatus[]
interface TripStatusSlice {
  name:  string
  value: number
  color: string
}

// From getAllTrips → data[]  (formatTrip shape)
interface AdminTrip {
  id: string
  route: { from: string; to: string; via?: string }
  driver: { name: string; avatar: string; rating: number; isVerified: boolean }
  date:     string
  time:     string
  seats:    { booked: number; total: number }
  farePerSeat: number
  status:   string   // "Ongoing" | "Upcoming" | "Completed" | "Cancelled"
}

// From getTripStats → data
interface TripStats {
  todayTrips:     number
  activeTrips:    number
  completedToday: number
  cancelledToday: number
  totalTrips:     number
}

// Recent activity — derived locally from trip list (no dedicated endpoint)
const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  Ongoing:   { icon: '🚗', color: 'bg-green-500/20 text-green-400'  },
  Upcoming:  { icon: '📅', color: 'bg-blue-500/20 text-blue-400'    },
  Completed: { icon: '🏁', color: 'bg-gray-500/20 text-gray-400'    },
  Cancelled: { icon: '❌', color: 'bg-red-500/20 text-red-400'      },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-white/5 rounded animate-pulse ${className}`} />
}

function KpiCard({
  label, value, change, up, icon: Icon, iconColor, href, loading,
}: {
  label: string; value: string; change: string; up: boolean
  icon: any; iconColor: string; href: string; loading: boolean
}) {
  return (
    <Link href={href}>
      <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-[#161c31] transition-all cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon size={18} />
          </div>
          {loading ? <Skeleton className="h-5 w-12" /> : (
            <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
              up ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
            }`}>
              {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{change}
            </span>
          )}
        </div>
        {loading
          ? <Skeleton className="h-8 w-28 mb-1" />
          : <p className="text-3xl font-black text-white leading-none mb-1" style={{ fontFamily: "'Outfit',sans-serif" }}>{value}</p>
        }
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-600 group-hover:text-blue-400 transition">
          View details <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1e2333] border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-blue-400">₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
      {payload[1] && (
        <p className="text-xs text-gray-500">Fee: ₹{payload[1]?.value?.toLocaleString('en-IN')}</p>
      )}
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  Ongoing:   'bg-green-500/15 text-green-400 border-green-500/20',
  Upcoming:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Completed: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [period,   setPeriod]   = useState<'week' | 'month' | 'quarter'>('month')
  const [loading,  setLoading]  = useState(true)
  const [refresh,  setRefresh]  = useState(false)
  const [error,    setError]    = useState('')

  // API data
  const [kpis,        setKpis]        = useState<Kpis | null>(null)
  const [revenueChart,setRevenueChart]= useState<RevenuePoint[]>([])
  const [topRoutes,   setTopRoutes]   = useState<TopRoute[]>([])
  const [tripStatus,  setTripStatus]  = useState<TripStatusSlice[]>([])
  const [tripStats,   setTripStats]   = useState<TripStats | null>(null)
  const [recentTrips, setRecentTrips] = useState<AdminTrip[]>([])
  const [totalDocs,   setTotalDocs]   = useState(0)
  const [liveCount,   setLiveCount]   = useState(0)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('')
    try {
      // Fire both requests in parallel
      const [overviewRes, tripStatsRes, recentTripsRes] = await Promise.all([
        api.get(`/admin/analytics/overview?period=${period}`),
        api.get('/admin/trips/stats'),
        api.get('/admin/trips?limit=5&page=1'),
      ])

      // ── Analytics overview ───────────────────────────────────────────────
      if (overviewRes.data.success) {
        const d = overviewRes.data.data
        setKpis(d.kpis)
        setRevenueChart(d.revenueChart || [])
        setTopRoutes(d.topRoutes || [])
        setTripStatus(d.tripStatus || [])
        setTotalDocs(d.totalTripDocs || 0)
      }

      // ── Trip stats (today strip) ─────────────────────────────────────────
      if (tripStatsRes.data.success) {
        const s = tripStatsRes.data.data
        setTripStats(s)
        setLiveCount(s.activeTrips || 0)
      }

      // ── Recent trips table ───────────────────────────────────────────────
      if (recentTripsRes.data.success) {
        setRecentTrips(recentTripsRes.data.data || [])
      }
    } catch (e: any) {
      console.error('Admin dashboard fetch error', e)
      setError(e.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [period])

  // Initial load
  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresh handler
  const handleRefresh = () => {
    setRefresh(true)
    fetchAll().finally(() => setTimeout(() => setRefresh(false), 500))
  }

  // Simulate live count ticking (replace with WebSocket later)
  useEffect(() => {
    if (liveCount === 0) return
    const t = setInterval(() => {
      setLiveCount(c => Math.max(0, c + Math.floor(Math.random() * 3) - 1))
    }, 5000)
    return () => clearInterval(t)
  }, [liveCount])

  // ── KPI cards config — maps API fields to display ────────────────────────
  const KPI_CARDS = [
    {
      label:     'Total Users',
      value:     kpis ? kpis.newUsers.toLocaleString('en-IN') : '—',
      change:    kpis ? `${kpis.usersGrowth > 0 ? '+' : ''}${kpis.usersGrowth}%` : '—',
      up:        (kpis?.usersGrowth ?? 0) >= 0,
      icon:      Users,
      iconColor: 'bg-blue-500/20 text-blue-400',
      href:      '/admin/users',
    },
    {
      label:     'Active Trips Today',
      value:     tripStats ? String(liveCount) : '—',
      change:    kpis ? `+${kpis.tripsGrowth}%` : '—',
      up:        true,
      icon:      Car,
      iconColor: 'bg-green-500/20 text-green-400',
      href:      '/admin/trips',
    },
    {
      label:     'Revenue This Month',
      value:     kpis ? `₹${kpis.totalRevenue.toLocaleString('en-IN')}` : '—',
      change:    kpis ? `${kpis.revenueGrowth > 0 ? '+' : ''}${kpis.revenueGrowth}%` : '—',
      up:        (kpis?.revenueGrowth ?? 0) >= 0,
      icon:      Wallet,
      iconColor: 'bg-amber-500/20 text-amber-400',
      href:      '/admin/earnings',
    },
    {
      label:     'Platform Revenue',
      value:     kpis ? `₹${kpis.platformRevenue.toLocaleString('en-IN')}` : '—',
      change:    kpis ? `${kpis.revenueGrowth > 0 ? '+' : ''}${kpis.revenueGrowth}%` : '—',
      up:        (kpis?.revenueGrowth ?? 0) >= 0,
      icon:      TrendingUp,
      iconColor: 'bg-purple-500/20 text-purple-400',
      href:      '/admin/earnings',
    },
  ]

  const donutTotal = tripStatus.reduce((s, t) => s + t.value, 0)

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Fleet Overview
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time logistics and operations performance.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
            {(['week','month','quarter'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition capitalize ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}>
                {p === 'week' ? 'Last 7 Days' : p === 'month' ? 'Last 30 Days' : 'This Quarter'}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} disabled={loading || refresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition">
            <RefreshCw size={13} className={refresh ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link href="/admin/trips">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition">
              <Zap size={13} className="text-blue-400" /> Dispatch New Trip
            </button>
          </Link>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 text-sm text-red-400 flex items-center gap-3">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
          <button onClick={handleRefresh} className="ml-auto text-xs text-red-300 underline">Retry</button>
        </div>
      )}

      {/* ── Today strip ── */}
      {(loading || tripStats) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Trips", key: 'todayTrips',     color: 'text-white'        },
            { label: 'Active Now',    key: 'activeTrips',    color: 'text-green-400',   dot: true },
            { label: 'Completed',     key: 'completedToday', color: 'text-gray-400'     },
            { label: 'Cancelled',     key: 'cancelledToday', color: 'text-red-400'      },
          ].map(({ label, key, color, dot }) => (
            <div key={key} className="bg-[#13172a] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
              {dot && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
                {loading
                  ? <Skeleton className="h-6 w-10 mt-1" />
                  : <p className={`text-xl font-black mt-0.5 ${color}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                      {tripStats?.[key as keyof TripStats] ?? 0}
                    </p>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map((k, i) => (
          <KpiCard key={k.label} {...k} loading={loading} />
        ))}
      </div>

      {/* ── Supplementary KPIs ── */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Avg Trip Value', value: `₹${kpis.avgTripValue.toLocaleString('en-IN')}`, color: 'text-amber-400' },
            { icon: ShieldCheck, label: 'Avg Rating',    value: `${kpis.avgRating}★`,                            color: 'text-blue-400'  },
            { icon: Leaf,        label: 'Carbon Saved',  value: `${kpis.carbonSaved.toLocaleString()} kg CO₂`,   color: 'text-green-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-[#13172a] border border-white/8 rounded-2xl px-5 py-3.5 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</p>
                <p className={`text-lg font-black mt-0.5 ${color}`} style={{ fontFamily: "'Outfit',sans-serif" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Map + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Live map */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-bold text-white">Live Operations — India</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-500">Kerala · Karnataka · Tamil Nadu</span>
              <button className="text-gray-500 hover:text-white transition"><MoreHorizontal size={16} /></button>
            </div>
          </div>
          <div style={{ height: '340px' }}>
            <AdminLiveMap />
          </div>
          <div className="flex items-center gap-4 px-5 py-3 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-sm bg-blue-500" /> High Density
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-sm bg-blue-800" /> Moderate
            </div>
            <div className="ml-auto text-xs text-gray-500">
              {loading ? '—' : liveCount} active rides
            </div>
          </div>
        </div>

        {/* Recent trips as activity feed */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
            <span className="text-sm font-bold text-white">Recent Activity</span>
            <Link href="/admin/trips">
              <button className="text-[10px] text-blue-400 hover:underline">View All</button>
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))
              : recentTrips.map((t) => {
                  const cfg = ACTIVITY_ICONS[t.status] || { icon: '🚗', color: 'bg-blue-500/20 text-blue-400' }
                  return (
                    <Link key={t.id} href={`/admin/trips/${t.id}`}>
                      <div className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/3 transition cursor-pointer">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-200 leading-tight truncate">
                            {t.route.from} → {t.route.to}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {t.driver.name} · {t.seats.booked}/{t.seats.total} seats
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[t.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
                            {t.status}
                          </span>
                          <p className="text-[10px] text-gray-600 mt-0.5">₹{t.farePerSeat}/seat</p>
                        </div>
                      </div>
                    </Link>
                  )
                })
            }
          </div>
          <div className="px-5 py-3 border-t border-white/5 shrink-0">
            <Link href="/admin/analytics">
              <button className="w-full text-xs text-blue-400 hover:text-blue-300 transition font-semibold">
                View Audit Logs →
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Revenue chart + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Revenue bar chart — real data from revenueChart */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-white">Daily Revenue</span>
              <span className="flex items-center gap-1 text-[10px] bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                <span className="w-2 h-2 rounded-sm bg-blue-500" /> Gross (₹)
              </span>
              <span className="flex items-center gap-1 text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-bold">
                <span className="w-2 h-2 rounded-sm bg-purple-500" /> Platform Fee
              </span>
            </div>
            <button className="text-gray-500 hover:text-white transition"><Download size={14} /></button>
          </div>
          <div className="p-5" style={{ height: '260px' }}>
            {loading
              ? <div className="h-full flex items-end gap-1.5 pb-4">
                  {Array.from({length:14}).map((_,i) => (
                    <div key={i} className="flex-1 bg-white/5 rounded-t animate-pulse" style={{ height: `${30 + Math.random()*60}%` }} />
                  ))}
                </div>
              : revenueChart.length > 0
              ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChart} barSize={14} barGap={2}>
                    <XAxis dataKey="label" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="gross" radius={[4, 4, 0, 0]} fill="#2563eb" />
                    <Bar dataKey="fee"   radius={[4, 4, 0, 0]} fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              )
              : <div className="h-full flex items-center justify-center text-gray-600 text-sm">No revenue data for this period</div>
            }
          </div>
        </div>

        {/* Trip status donut — real tripStatus from API */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5">
            <span className="text-sm font-bold text-white">Trip Status Breakdown</span>
          </div>
          <div className="p-5 flex flex-col items-center">
            {loading
              ? <div className="w-44 h-44 rounded-full border-8 border-white/5 animate-pulse" />
              : (
                <div className="relative" style={{ width: 180, height: 180 }}>
                  <PieChart width={180} height={180}>
                    <Pie data={tripStatus.filter(t => t.value > 0)} cx={85} cy={85}
                      innerRadius={55} outerRadius={80}
                      dataKey="value" strokeWidth={2} stroke="#0a0d14">
                      {tripStatus.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
                      {donutTotal > 1000 ? `${(donutTotal/1000).toFixed(1)}k` : donutTotal}
                    </p>
                    <p className="text-[10px] text-gray-500">total</p>
                  </div>
                </div>
              )
            }
            <div className="w-full space-y-2 mt-3">
              {(loading ? [{name:'Completed',value:0,color:'#3b82f6'},{name:'Cancelled',value:0,color:'#ef4444'},{name:'Upcoming',value:0,color:'#6b7280'},{name:'Ongoing',value:0,color:'#22c55e'}] : tripStatus).map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-400">{d.name}</span>
                  </div>
                  {loading
                    ? <Skeleton className="h-3 w-10" />
                    : <span className="text-xs font-bold text-gray-300">
                        {d.value} {donutTotal > 0 ? `(${Math.round(d.value/donutTotal*100)}%)` : ''}
                      </span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top routes — real data from topRoutes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Quick actions */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl p-5">
          <p className="text-sm font-bold text-white mb-4">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Users,         label: 'Add User',    href: '/admin/users',        color: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'    },
              { icon: Car,           label: 'New Trip',    href: '/admin/trips',        color: 'bg-green-500/15 text-green-400 hover:bg-green-500/25' },
              { icon: ShieldCheck,   label: 'Verify KYC', href: '/admin/verification', color: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' },
              { icon: AlertTriangle, label: 'Disputes',   href: '/admin/disputes',     color: 'bg-red-500/15 text-red-400 hover:bg-red-500/25'       },
              { icon: Download,      label: 'Export',     href: '/admin/analytics',    color: 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25'},
              { icon: Wallet,        label: 'Payouts',    href: '/admin/earnings',     color: 'bg-gray-500/15 text-gray-400 hover:bg-gray-500/25'    },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={label} href={href}>
                <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 cursor-pointer transition ${color}`}>
                  <Icon size={16} />
                  <span className="text-[10px] font-bold text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top routes — from API */}
        <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
            <span className="text-sm font-bold text-white">Top Routes This Period</span>
            <Link href="/admin/analytics">
              <button className="text-[10px] text-blue-400 hover:underline">View Analytics →</button>
            </Link>
          </div>
          <div className="p-5 space-y-3">
            {loading
              ? Array.from({length:5}).map((_,i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-4 h-3" />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between mb-1">
                        <Skeleton className="h-3 w-44" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))
              : topRoutes.length === 0
              ? <p className="text-center text-gray-600 text-sm py-6">No route data for this period</p>
              : topRoutes.map((r) => (
                  <div key={r.route} className="flex items-center gap-4">
                    <span className="text-[10px] text-gray-600 font-mono w-4 shrink-0">{r.count}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-300 truncate">{r.route}</p>
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{r.count} bookings</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-700"
                          style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-300 shrink-0 w-24 text-right">
                      ₹{r.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* ── Recent trips table — real data from getAllTrips ── */}
      <div className="bg-[#13172a] border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <span className="text-sm font-bold text-white">Recent Trips</span>
          <Link href="/admin/trips">
            <button className="flex items-center gap-1 text-xs text-blue-400 hover:underline font-semibold">
              View All <ChevronRight size={12} />
            </button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                {['Trip ID','Route','Driver','Date','Fare','Seats','Status','Actions'].map((h) => (
                  <th key={h} className={`text-left ${h === 'Trip ID' ? 'px-5' : 'px-4'} py-3`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading
                ? Array.from({length:5}).map((_,i) => (
                    <tr key={i}>
                      {Array.from({length:8}).map((__,j) => (
                        <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                : recentTrips.length === 0
                ? <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-600 text-sm">No trips found</td></tr>
                : recentTrips.map((t) => {
                    const sc = STATUS_COLOR[t.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'
                    return (
                      <tr key={t.id} className="hover:bg-white/3 transition group">
                        <td className="px-5 py-3.5">
                          <span className="text-[11px] font-mono text-gray-500">
                            #{String(t.id).slice(-8)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-gray-200">
                            {t.route.from} → {t.route.to}
                          </span>
                          {t.route.via && (
                            <p className="text-[10px] text-gray-600 mt-0.5">{t.route.via}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                              {t.driver.avatar}
                            </div>
                            <div>
                              <span className="text-xs text-gray-300">{t.driver.name}</span>
                              {t.driver.isVerified && (
                                <ShieldCheck size={9} className="inline ml-1 text-blue-400" />
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-500">
                            {new Date(t.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}, {t.time}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-bold text-gray-200">₹{t.farePerSeat}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-400">{t.seats.booked}/{t.seats.total}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <Link href={`/admin/trips/${t.id}`}>
                              <button className="text-[10px] text-gray-400 hover:text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition font-semibold">
                                View
                              </button>
                            </Link>
                            {t.status !== 'Completed' && t.status !== 'Cancelled' && (
                              <button className="text-[10px] text-gray-400 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition font-semibold">
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}